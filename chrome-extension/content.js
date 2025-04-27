// Keep track of previous code content to detect rapid changes
let previousCode = ""
let lastPasteTime = 0
let documentHasFocus = true
let blockedPageApplied = false

// Default API URL (will be overridden if available)
let API_URL = "https://anti-cheating-livid.vercel.app/api"

// Try to get API URL from storage
chrome.storage.local.get(["apiUrl"], (result) => {
  if (result.apiUrl) {
    API_URL = result.apiUrl
  }
})

// Initialize monitoring
function initMonitoring() {
  console.log("Exam Proctor: Initializing monitoring")

  // Block access to known AI sites immediately
  blockAISites()

  // Listen for copy/paste events
  document.addEventListener("paste", handlePaste)

  // Listen for focus/blur events
  window.addEventListener("focus", handleFocus)
  window.addEventListener("blur", handleBlur)

  // Listen for visibility change
  document.addEventListener("visibilitychange", handleVisibilityChange)

  // Detect code changes and analyze for suspicious patterns
  if (isCodeEditor()) {
    setInterval(checkCodeChanges, 5000)
  }

  // Set up a MutationObserver to detect DOM changes and rerun blocking
  const observer = new MutationObserver(() => {
    if (!blockedPageApplied) {
      blockAISites()
    }
  })

  // Start observing the document with the configured parameters
  observer.observe(document, { childList: true, subtree: true })

  // Periodically check for AI sites (in case the initial check was bypassed)
  setInterval(blockAISites, 1000)
}

// Handle paste events
function handlePaste(event) {
  const now = Date.now()

  // Check if monitoring is active
  chrome.storage.local.get(["monitoring"], (result) => {
    if (!result.monitoring) return

    // Get pasted content
    let pastedContent = ""
    if (event.clipboardData) {
      pastedContent = event.clipboardData.getData("text")
    }

    // Report paste event if content is substantial (more than 20 chars)
    if (pastedContent.length > 20) {
      chrome.runtime.sendMessage({
        action: "copyPasteDetected",
        content: pastedContent.substring(0, 200) + (pastedContent.length > 200 ? "..." : ""),
      })

      lastPasteTime = now
    }
  })
}

// Handle window focus
function handleFocus() {
  documentHasFocus = true
}

// Handle window blur
function handleBlur() {
  documentHasFocus = false

  // Report tab switch
  chrome.storage.local.get(["monitoring"], (result) => {
    if (result.monitoring) {
      chrome.runtime.sendMessage({
        action: "tabSwitchDetected",
      })
    }
  })
}

// Handle visibility change
function handleVisibilityChange() {
  if (document.visibilityState === "hidden") {
    // Report tab switch with debouncing
    chrome.storage.local.get(["monitoring", "lastTabSwitchTime"], (result) => {
      if (!result.monitoring) return

      const now = Date.now()
      const lastReportTime = result.lastTabSwitchTime || 0

      // Only report if it's been at least 10 seconds since the last report
      if (now - lastReportTime > 10000) {
        chrome.runtime.sendMessage({
          action: "tabSwitchDetected",
        })

        // Store the time of this report
        chrome.storage.local.set({ lastTabSwitchTime: now })
      }
    })
  }
}

// Check for suspicious code changes
function checkCodeChanges() {
  // Check if monitoring is active
  chrome.storage.local.get(["monitoring"], (result) => {
    if (!result.monitoring) return

    // Get current code content
    const codeElement = getCodeEditorElement()
    if (!codeElement) return

    const currentCode = getEditorContent(codeElement)

    // If we have previous code to compare
    if (previousCode) {
      // Calculate differences and analyze for suspicious patterns
      const addedLines = calculateAddedLines(previousCode, currentCode)

      // If substantial code was added quickly, report it
      if (addedLines.length > 5 && Date.now() - lastPasteTime > 10000) {
        // This indicates the student may have copied code but not directly pasted it
        // (e.g., using another method to bypass paste detection)
        checkSuspiciousPattern(addedLines.join("\n"))
      }
    }

    previousCode = currentCode
  })
}

// Check for suspicious code patterns using server-side Python NLP
async function checkSuspiciousPattern(code) {
  // First do a quick client-side check
  const suspiciousPatterns = [
    // Complex one-liners
    /\.(map|filter|reduce)$$.*=>\s*{[\s\S]*?}$$/,
    // Very structured comments
    /\/\*\*[\s\S]*?\*\//,
    // Perfect formatting
    /\{\s*\n\s*[a-zA-Z]+.*\n\s*\}/,
    // Step-by-step comments
    /\/\/ Step [0-9]+:/,
    // Time complexity comments
    /\/\/ Time [Cc]omplexity: O$$[^)]+$$/,
    // Space complexity comments
    /\/\/ Space [Cc]omplexity: O$$[^)]+$$/,
  ]

  let isLocallySuspicious = false

  // Check if code matches suspicious patterns
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(code)) {
      isLocallySuspicious = true
      break
    }
  }

  // If locally suspicious or code is long enough to warrant checking
  if (isLocallySuspicious || code.length > 200) {
    // Get student and exam IDs
    chrome.storage.local.get(["monitoring", "studentId", "examId", "apiUrl"], async (result) => {
      if (!result.monitoring || !result.studentId || !result.examId) return

      // Update API_URL if available in storage
      if (result.apiUrl) {
        API_URL = result.apiUrl
      }

      try {
        // Send to server for more sophisticated Python-based NLP analysis
        const response = await fetch(`${API_URL}/python/nlp-check`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            studentId: result.studentId,
            examId: result.examId,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to analyze code")
        }

        const data = await response.json()

        // If the server detected suspicious patterns, it will create an incident
        // We don't need to do anything else here
        console.log("NLP check result:", data)
      } catch (error) {
        console.error("Error in NLP check:", error)

        // Fall back to local detection if server check fails
        if (isLocallySuspicious) {
          chrome.runtime.sendMessage({
            action: "nlpSuspicious",
            content: "Suspicious code pattern detected: " + code.substring(0, 200),
          })
        }
      }
    })
  }
}

// Block access to AI sites
function blockAISites() {
  // Comprehensive list of AI domains and keywords to block
  const blockedDomains = [
    "chat.openai.com",
    "openai.com",
    "chatgpt",
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

  // Check if current site is blocked
  const currentUrl = window.location.href.toLowerCase()
  const currentDomain = window.location.hostname.toLowerCase()

  // More aggressive checking - check both domain and URL path
  const isBlocked = blockedDomains.some(
      (domain) =>
          currentDomain.includes(domain) || currentUrl.includes(`/${domain}`) || currentUrl.includes(`//${domain}`),
  )

  // Additional check for ChatGPT and other AI tools by looking for specific UI elements
  const hasChatGPTElements =
      document.querySelector('[aria-label="ChatGPT"]') !== null ||
      document.querySelector('[class*="chatgpt"]') !== null ||
      document.querySelector('[id*="chatgpt"]') !== null ||
      document.querySelector('[class*="openai"]') !== null ||
      document.querySelector('[id*="openai"]') !== null ||
      document.querySelector('[class*="claude"]') !== null ||
      document.querySelector('[class*="gemini"]') !== null ||
      document.querySelector('[class*="gpt-"]') !== null

  if (isBlocked || hasChatGPTElements) {
    console.log("Exam Proctor: Blocking AI site", currentDomain, currentUrl)

    // Set flag to indicate we've applied the blocked page
    blockedPageApplied = true

    // Immediately stop any further page loading/rendering
    window.stop()

    // Replace the entire page content with a more prominent message
    document.documentElement.innerHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Access Blocked</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #b91c1c;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            color: white;
            overflow: hidden;
          }
          .blocked-container {
            background-color: #7f1d1d;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            padding: 40px;
            text-align: center;
            max-width: 500px;
            width: 90%;
            animation: pulse 2s infinite;
          }
          .blocked-icon {
            font-size: 80px;
            margin-bottom: 20px;
          }
          h1 {
            font-size: 28px;
            margin-bottom: 20px;
          }
          p {
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 16px;
          }
          .warning {
            background-color: #fecaca;
            border-radius: 4px;
            padding: 16px;
            margin-top: 20px;
            color: #7f1d1d;
            font-weight: bold;
          }
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
          }
        </style>
        <script>
          // Prevent navigation away from this page
          history.pushState(null, null, document.URL);
          window.addEventListener('popstate', function () {
            history.pushState(null, null, document.URL);
          });
          
          // Disable right-click
          document.addEventListener('contextmenu', event => event.preventDefault());
          
          // Disable keyboard shortcuts
          document.addEventListener('keydown', function(e) {
            if (e.key == 'F5' || 
                (e.ctrlKey && e.key == 'r') || 
                (e.ctrlKey && e.key == 'F5') ||
                (e.ctrlKey && e.key == 'l') ||
                (e.metaKey && e.key == 'r')) {
              e.preventDefault();
            }
          });
          
          // Continuously check if the page is being modified and restore if needed
          setInterval(function() {
            const container = document.querySelector('.blocked-container');
            if (!container) {
              window.location.reload();
            }
          }, 100);
        </script>
      </head>
      <body>
        <div class="blocked-container">
          <div class="blocked-icon">⛔</div>
          <h1>ACCESS BLOCKED</h1>
          <p>This AI tool or website has been blocked during the exam.</p>
          <p>Using AI assistants or code generators is strictly prohibited during this assessment.</p>
          <div class="warning">
            THIS VIOLATION HAS BEEN REPORTED TO YOUR EXAM ADMINISTRATOR
          </div>
        </div>
      </body>
      </html>
    `

    // Report the incident
    chrome.storage.local.get(["monitoring", "studentId", "examId"], (result) => {
      if (result.monitoring) {
        chrome.runtime.sendMessage({
          action: "blocked_site",
          content: `Attempted to access blocked AI tool: ${currentDomain} (${currentUrl})`,
        })
      }
    })

    // Prevent any attempts to navigate away
    window.addEventListener("beforeunload", (e) => {
      e.preventDefault()
      e.returnValue = ""
      return ""
    })
  }
}

// Helper: Check if current page is a code editor
function isCodeEditor() {
  // Check for common coding platforms
  const url = window.location.href
  return (
      url.includes("codepen.io") ||
      url.includes("codesandbox.io") ||
      url.includes("replit.com") ||
      url.includes("jsfiddle.net") ||
      url.includes("leetcode.com") ||
      url.includes("hackerrank.com") ||
      document.querySelector('textarea[class*="code"]') !== null ||
      document.querySelector('div[class*="editor"]') !== null ||
      document.querySelector('pre[class*="code"]') !== null
  )
}

// Helper: Get the editor element
function getCodeEditorElement() {
  // Try to find common editor elements
  return (
      document.querySelector('textarea[class*="code"]') ||
      document.querySelector('div[class*="editor"]') ||
      document.querySelector('pre[class*="code"]') ||
      document.querySelector('div[contenteditable="true"]')
  )
}

// Helper: Get content from editor element
function getEditorContent(element) {
  if (element.tagName === "TEXTAREA") {
    return element.value
  } else if (element.getAttribute("contenteditable") === "true") {
    return element.innerText
  } else {
    return element.textContent
  }
}

// Helper: Calculate lines added between previous and current code
function calculateAddedLines(oldCode, newCode) {
  const oldLines = oldCode.split("\n")
  const newLines = newCode.split("\n")
  const addedLines = []

  // Very simple diff - in real implementation would use proper diff algorithm
  if (newLines.length > oldLines.length) {
    for (let i = 0; i < newLines.length; i++) {
      if (i >= oldLines.length || newLines[i] !== oldLines[i]) {
        addedLines.push(newLines[i])
      }
    }
  }

  return addedLines
}

// Start monitoring immediately
console.log("Exam Proctor: Content script loaded")
initMonitoring()

// Run the blocking function immediately
blockAISites()
