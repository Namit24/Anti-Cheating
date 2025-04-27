// Extension state
let monitoring = false
let studentId = null
let examId = null
let lastHeartbeatTime = Date.now()
let heartbeatInterval = null

// Expanded list of blacklisted domains
const blacklistedDomains = [
  "chat.openai.com",
  "openai.com",
  "claude.ai",
  "anthropic.com",
  "v0.dev",
  "grok.x.ai",
  "x.ai",
  "gemini.google.com",
  "bard.google.com",
  "github.com/features/copilot",
  "copilot.github.com",
  "bing.com/chat",
  "perplexity.ai",
  "huggingface.co",
  "poe.com",
  "phind.com",
  "codeium.com",
  "tabnine.com",
  "deepai.org",
  "replicate.com",
  "chatgpt",
  "gpt-4",
  "gpt-3",
  "ai.com",
  "cohere.ai",
  "writesonic.com",
  "jasper.ai",
  "copy.ai",
  "rytr.me",
  "ai21.com",
  "forefront.ai",
  "together.ai",
  "deepl.com",
  "llama.meta.com",
  "mistral.ai",
  "stability.ai",
  "midjourney.com",
  "character.ai",
  "inflection.ai",
  "deepmind.google",
  "ai.google",
  "ai.meta.com",
  "ai.facebook.com",
  "ai.microsoft.com",
  "codex.openai",
  "dall-e",
  "dalle",
  "chatbot.openai",
]

// Default API URL (will be overridden by config.js)
let API_URL = "https://anti-cheating-livid.vercel.app/api"

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("Exam Proctor extension installed")
  checkInitialExtensionStatus()
})

// Check if we need to monitor (on browser startup)
chrome.runtime.onStartup.addListener(() => {
  checkInitialExtensionStatus()
})

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message:", message)

  if (message.action === "setApiUrl") {
    API_URL = message.url
    console.log("API URL set to:", API_URL)
    sendResponse({ success: true })
    return true
  }

  if (message.action === "startMonitoring") {
    startMonitoring(message.studentId, message.examId)
    sendResponse({ success: true })
    return true
  }

  if (message.action === "stopMonitoring") {
    stopMonitoring()
    sendResponse({ success: true })
    return true
  }

  if (message.action === "copyPasteDetected") {
    reportIncident("copy_paste", message.content || "Copy-paste action detected")
    sendResponse({ success: true })
    return true
  }

  if (message.action === "tabSwitchDetected") {
    reportIncident("tab_switch", "Tab or window switch detected")
    sendResponse({ success: true })
    return true
  }

  if (message.action === "nlpSuspicious") {
    reportIncident("nlp_suspicious", message.content || "Suspicious code pattern detected")
    sendResponse({ success: true })
    return true
  }
})

// Check extension status from storage
function checkInitialExtensionStatus() {
  chrome.storage.local.get(["monitoring", "studentId", "examId", "apiUrl"], (result) => {
    if (result.apiUrl) {
      API_URL = result.apiUrl
    }

    if (result.monitoring && result.studentId && result.examId) {
      startMonitoring(result.studentId, result.examId)
    }
  })
}

// Start monitoring student activity
function startMonitoring(sId, eId) {
  studentId = sId
  examId = eId
  monitoring = true

  chrome.storage.local.set({ monitoring: true, apiUrl: API_URL })

  // Set up web navigation monitoring
  chrome.webNavigation.onCompleted.addListener(checkWebNavigation)

  // Monitor tab changes
  chrome.tabs.onActivated.addListener(handleTabChange)

  // Monitor window focus changes
  chrome.windows.onFocusChanged.addListener(handleWindowFocusChange)

  console.log("Started monitoring for student:", studentId, "exam:", examId)

  // Start sending heartbeats to detect extension shutdown
  startHeartbeat()

  // Register the uninstall URL to report if extension is removed
  chrome.runtime.setUninstallURL(`${API_URL}/incidents/extension-removed?studentId=${studentId}&examId=${examId}`)

  // Check if extension is disabled (periodic check)
  setInterval(checkPeriodicExtensionStatus, 30000)

  // Report that monitoring has started
  reportIncident("extension_started", "Exam proctoring started")
}

// Start sending heartbeats to the server
function startHeartbeat() {
  // Clear any existing interval
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
  }

  // Set up heartbeat interval
  heartbeatInterval = setInterval(async () => {
    if (!monitoring || !studentId || !examId) return

    try {
      lastHeartbeatTime = Date.now()

      await fetch(`${API_URL}/students`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          status: "active",
          extensionActive: true,
          lastHeartbeat: lastHeartbeatTime,
        }),
      })
    } catch (error) {
      console.error("Heartbeat error:", error)
    }
  }, 15000) // Send heartbeat every 15 seconds
}

// Stop monitoring
function stopMonitoring() {
  // Report that monitoring has stopped
  if (monitoring && studentId && examId) {
    reportIncident("extension_stopped", "Exam proctoring stopped")
  }

  monitoring = false

  // Clear heartbeat interval
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }

  studentId = null
  examId = null

  chrome.storage.local.set({ monitoring: false })
  chrome.webNavigation.onCompleted.removeListener(checkWebNavigation)
  chrome.tabs.onActivated.removeListener(handleTabChange)
  chrome.windows.onFocusChanged.removeListener(handleWindowFocusChange)

  console.log("Stopped monitoring")
}

// Monitor web navigation
function checkWebNavigation(details) {
  if (!monitoring || details.frameId !== 0) return

  const url = new URL(details.url)
  const domain = url.hostname

  // Check if the domain is blacklisted
  if (blacklistedDomains.some((blockedDomain) => domain.includes(blockedDomain))) {
    reportIncident("blocked_site", `Visited blocked website: ${domain}`)
  }
}

// Handle tab changes
function handleTabChange(activeInfo) {
  if (!monitoring) return

  // Report tab change incident
  reportIncident("tab_switch", "Student switched to another tab")
}

// Handle window focus changes
function handleWindowFocusChange(windowId) {
  if (!monitoring) return

  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Window lost focus
    reportIncident("tab_switch", "Student switched to another application")
  }
}

// Report incidents to the server
async function reportIncident(incidentType, details) {
  if (!monitoring || !studentId || !examId) return

  try {
    // Get the last report time for this incident type
    chrome.storage.local.get([`lastReport_${incidentType}`], async (result) => {
      const lastReportTime = result[`lastReport_${incidentType}`] || 0
      const now = Date.now()

      // Only report if it's been at least 30 seconds since the last report of this type
      if (now - lastReportTime > 30000) {
        // Take a screenshot if possible
        let screenshot = null

        try {
          // Get the active tab
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
          if (tab && tab.id) {
            // Capture the visible area of the tab
            try {
              const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" })
              screenshot = dataUrl
            } catch (screenshotError) {
              console.error("Failed to capture screenshot:", screenshotError)
            }
          }
        } catch (tabQueryError) {
          console.error("Failed to query tabs:", tabQueryError)
        }

        const response = await fetch(`${API_URL}/incidents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId,
            examId,
            incidentType,
            details,
            screenshot,
          }),
        })

        if (!response.ok) {
          console.error("Failed to report incident:", response.statusText)
        } else {
          console.log("Incident reported successfully:", incidentType)

          // Update the last report time for this incident type
          chrome.storage.local.set({ [`lastReport_${incidentType}`]: now })
        }
      } else {
        console.log(`Incident ${incidentType} not reported due to cooldown period`)
      }
    })
  } catch (error) {
    console.error("Error reporting incident:", error)
  }
}

// Verify extension is still running periodically
function checkPeriodicExtensionStatus() {
  if (!monitoring) return

  // This function will execute periodically to ensure
  // the extension is still active. If the extension is
  // disabled and re-enabled, we'll need to report it
  console.log("Extension status check: monitoring active")
}
