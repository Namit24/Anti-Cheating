document.addEventListener("DOMContentLoaded", () => {
  // Get API URL from config.js
  const API_URL = window.API_URL || "https://anti-cheating-livid.vercel.app/api"

  console.log("Using API URL:", API_URL)

  // UI Elements
  const loginForm = document.getElementById("login-form")
  const examActive = document.getElementById("exam-active")
  const loading = document.getElementById("loading")
  const nameInput = document.getElementById("name")
  const rollNumberInput = document.getElementById("rollNumber")
  const roomNumberInput = document.getElementById("roomNumber")
  const examSelect = document.getElementById("exam")
  const registerBtn = document.getElementById("register-btn")
  const errorMessage = document.getElementById("error-message")
  const subjectNameElement = document.getElementById("subject-name")
  const roomNumberElement = document.getElementById("room-number")

  let currentStudent = null
  let currentExam = null

  // Send API URL to background script
  chrome.runtime.sendMessage({
    action: "setApiUrl",
    url: API_URL,
  })

  // Store API URL in storage
  chrome.storage.local.set({ apiUrl: API_URL })

  // Check if student is already registered
  chrome.storage.local.get(["studentId", "examId"], (result) => {
    if (result.studentId && result.examId) {
      fetchStudentDetails(result.studentId, result.examId)
    } else {
      fetchActiveExams()
    }
  })

  // Fetch available exams
  async function fetchActiveExams() {
    showLoading()
    try {
      console.log("Fetching exams from:", `${API_URL}/exams`)
      const response = await fetch(`${API_URL}/exams`)
      if (!response.ok) throw new Error("Failed to fetch exams")

      const exams = await response.json()
      console.log("Fetched exams:", exams)

      const activeExams = exams.filter((exam) => exam.status === "active")

      // Clear placeholder option
      examSelect.innerHTML = ""

      if (activeExams.length === 0) {
        const option = document.createElement("option")
        option.value = ""
        option.disabled = true
        option.selected = true
        option.textContent = "No active exams available"
        examSelect.appendChild(option)
        registerBtn.disabled = true
      } else {
        const defaultOption = document.createElement("option")
        defaultOption.value = ""
        defaultOption.disabled = true
        defaultOption.selected = true
        defaultOption.textContent = "Select an exam"
        examSelect.appendChild(defaultOption)

        activeExams.forEach((exam) => {
          const option = document.createElement("option")
          option.value = exam.id
          option.textContent = `${exam.subjectCode}: ${exam.subjectName} (Room ${exam.roomNumber})`
          option.dataset.room = exam.roomNumber
          option.dataset.subject = exam.subjectName
          examSelect.appendChild(option)
        })
      }
      hideLoading()
      showLoginForm()
    } catch (error) {
      console.error("Error fetching exams:", error)
      errorMessage.textContent = "Failed to load exams. Please try again."
      hideLoading()
      showLoginForm()
    }
  }

  // Set up polling to check for new exams
  const examPollingInterval = setInterval(async () => {
    // Only poll if we're on the login form
    if (!loginForm.classList.contains("hidden")) {
      try {
        const response = await fetch(`${API_URL}/exams`)
        if (!response.ok) throw new Error("Failed to fetch exams")

        const exams = await response.json()
        const activeExams = exams.filter((exam) => exam.status === "active")

        // Check if we need to update the dropdown
        const currentOptions = Array.from(examSelect.options)
            .filter((opt) => opt.value) // Skip the default/placeholder option
            .map((opt) => opt.value)

        const newExamIds = activeExams.map((exam) => exam.id)

        // If there are new exams or exams have been removed, refresh the list
        if (
            newExamIds.length !== currentOptions.length ||
            newExamIds.some((id) => !currentOptions.includes(id)) ||
            currentOptions.some((id) => !newExamIds.includes(id))
        ) {
          console.log("Exam list changed, refreshing...")
          fetchActiveExams()
        }
      } catch (error) {
        console.error("Error polling exams:", error)
      }
    }
  }, 5000) // Check every 5 seconds

  // Register student for exam
  registerBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim()
    const rollNumber = rollNumberInput.value.trim()
    const roomNumber = roomNumberInput.value.trim()
    const examId = examSelect.value

    if (!name || !rollNumber || !roomNumber || !examId) {
      errorMessage.textContent = "Please fill in all fields."
      return
    }

    showLoading()

    try {
      const response = await fetch(`${API_URL}/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          rollNumber,
          roomNumber,
          examId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Registration failed")
      }

      const student = await response.json()

      // Store student and exam info
      chrome.storage.local.set({
        studentId: student.id,
        examId: examId,
        studentName: name,
        rollNumber: rollNumber,
        // Initialize incident tracking timestamps
        lastTabSwitchTime: 0,
        lastReport_tab_switch: 0,
        lastReport_copy_paste: 0,
        lastReport_blocked_site: 0,
        lastReport_nlp_suspicious: 0,
      })

      currentStudent = student

      // Get exam details
      const selectedOption = examSelect.options[examSelect.selectedIndex]
      currentExam = {
        id: examId,
        subjectName: selectedOption.dataset.subject,
        roomNumber: selectedOption.dataset.room,
      }

      // Send message to background script to start monitoring
      chrome.runtime.sendMessage({
        action: "startMonitoring",
        studentId: student.id,
        examId: examId,
      })

      hideLoading()
      showExamActive()

      // Update exam info
      subjectNameElement.textContent = currentExam.subjectName
      roomNumberElement.textContent = currentExam.roomNumber
    } catch (error) {
      console.error("Registration error:", error)
      errorMessage.textContent = error.message || "Registration failed. Please try again."
      hideLoading()
      showLoginForm()
    }
  })

  // Fetch student details if already registered
  async function fetchStudentDetails(studentId, examId) {
    showLoading()
    try {
      // Fetch exam details
      const examResponse = await fetch(`${API_URL}/exams/${examId}`)
      if (!examResponse.ok) {
        // If exam is not found or not active anymore, reset registration
        if (examResponse.status === 404) {
          throw new Error("Exam not found or has ended")
        }
        throw new Error("Failed to fetch exam details")
      }

      const exam = await examResponse.json()

      // If exam is no longer active, reset registration
      if (exam.status !== "active") {
        throw new Error("Exam has ended")
      }

      currentExam = exam

      // Get student details from storage
      chrome.storage.local.get(["studentName", "rollNumber"], (result) => {
        currentStudent = {
          id: studentId,
          name: result.studentName,
          rollNumber: result.rollNumber,
        }

        // Update UI
        subjectNameElement.textContent = currentExam.subjectName
        roomNumberElement.textContent = currentExam.roomNumber

        hideLoading()
        showExamActive()

        // Restart monitoring
        chrome.runtime.sendMessage({
          action: "startMonitoring",
          studentId: studentId,
          examId: examId,
        })
      })
    } catch (error) {
      console.error("Error fetching details:", error)
      // Reset stored data
      chrome.storage.local.remove(["studentId", "examId", "studentName", "rollNumber"])
      fetchActiveExams()
    }
  }

  // UI Helper functions
  function showLoginForm() {
    loginForm.classList.remove("hidden")
    examActive.classList.add("hidden")
    loading.classList.add("hidden")
  }

  function showExamActive() {
    loginForm.classList.add("hidden")
    examActive.classList.remove("hidden")
    loading.classList.add("hidden")

    // Clear the polling interval when exam is active
    if (examPollingInterval) {
      clearInterval(examPollingInterval)
    }
  }

  function showLoading() {
    loginForm.classList.add("hidden")
    examActive.classList.add("hidden")
    loading.classList.remove("hidden")
  }

  function hideLoading() {
    loading.classList.add("hidden")
  }
})
