const CONFIG = {
  startDate: new Date("2026-07-05T00:00:00"),
  // DEPLOYED GOOGLE APPS SCRIPT WEB APP URL
  apiEndpoint: "https://script.google.com/macros/s/AKfycbxDeJZ9UDFyKDXUoJwjLZUpgW_rNjlKGNWp0IIvz4K6Dvv6LAxxhcB5Ap1k56z4zDUk/exec",
  currentUser: localStorage.getItem("qalbi_authenticated_user") || null,
  pins: {
    Zaroo: "1111",
    Salma: "2222"
  }
};

let selectedPhotoBase64 = "";
let selectedTaskPhotoBase64 = "";
let selectedUserAttempt = null;
let viewAllMemoriesMode = false;
let globalAllEntries = [];
let globalDateEntries = [];

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  startLiveTimer();
  setDefaultDate();
});

// Authentication System
function checkAuth() {
  if (CONFIG.currentUser) {
    document.getElementById("loginModal").classList.add("hidden");
    document.getElementById("mainApp").classList.remove("hidden");
    updateUserUI();
    loadInitialData();
  } else {
    document.getElementById("loginModal").classList.remove("hidden");
    document.getElementById("mainApp").classList.add("hidden");
  }
}

function selectUser(user) {
  selectedUserAttempt = user;
  document.querySelectorAll(".user-choice-btn").forEach(btn => btn.classList.remove("selected"));
  if (window.event && window.event.target) {
    window.event.target.classList.add("selected");
  }
  
  document.getElementById("pinPromptText").innerText = `Enter PIN for ${user}`;
  document.getElementById("pinBox").classList.remove("hidden");
  document.getElementById("pinInput").value = "";
  document.getElementById("pinInput").focus();
}

function verifyPin() {
  const pinEntered = document.getElementById("pinInput").value;
  if (pinEntered === CONFIG.pins[selectedUserAttempt]) {
    CONFIG.currentUser = selectedUserAttempt;
    localStorage.setItem("qalbi_authenticated_user", CONFIG.currentUser);
    checkAuth();
  } else {
    alert("Incorrect PIN! Please try again.");
    document.getElementById("pinInput").value = "";
  }
}

function logout() {
  localStorage.removeItem("qalbi_authenticated_user");
  CONFIG.currentUser = null;
  selectedUserAttempt = null;
  document.getElementById("pinBox").classList.add("hidden");
  document.querySelectorAll(".user-choice-btn").forEach(btn => btn.classList.remove("selected"));
  checkAuth();
}

function updateUserUI() {
  const partnerName = CONFIG.currentUser === "Zaroo" ? "Salma" : "Zaroo";
  document.getElementById("userTag").innerText = `Viewing as ${CONFIG.currentUser}`;
  document.getElementById("myAnswerLabel").innerText = `${CONFIG.currentUser}'s Response`;
  document.getElementById("partnerAnswerLabel").innerText = `${partnerName}'s Response`;
  document.getElementById("myTaskLabel").innerText = `${CONFIG.currentUser}'s Task Entry ✅`;
  document.getElementById("partnerTaskLabel").innerText = `${partnerName}'s Task Entry`;
}

// Live Countdown Timer
function startLiveTimer() {
  function update() {
    const now = new Date();
    const diff = Math.max(0, now - CONFIG.startDate);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    document.getElementById("days").innerText = String(days).padStart(3, '0');
    document.getElementById("hours").innerText = String(hours).padStart(2, '0');
    document.getElementById("mins").innerText = String(mins).padStart(2, '0');
    document.getElementById("secs").innerText = String(secs).padStart(2, '0');
  }
  update();
  setInterval(update, 1000);
}

function setDefaultDate() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("datePicker").value = today;
}

// Canvas Image Processing
function handlePhotoSelect(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.src = e.target.result;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 800;
      const scale = MAX_WIDTH / img.width;
      canvas.width = scale < 1 ? MAX_WIDTH : img.width;
      canvas.height = scale < 1 ? img.height * scale : img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      selectedPhotoBase64 = canvas.toDataURL("image/jpeg", 0.7);
      document.getElementById("imagePreview").src = selectedPhotoBase64;
      document.getElementById("previewBox").classList.remove("hidden");
    };
  };
  reader.readAsDataURL(file);
}

function clearPhoto() {
  selectedPhotoBase64 = "";
  document.getElementById("previewBox").classList.add("hidden");
}

function handleTaskPhoto(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.src = e.target.result;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 800;
      const scale = MAX_WIDTH / img.width;
      canvas.width = scale < 1 ? MAX_WIDTH : img.width;
      canvas.height = scale < 1 ? img.height * scale : img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      selectedTaskPhotoBase64 = canvas.toDataURL("image/jpeg", 0.7);
      document.getElementById("taskImagePreview").src = selectedTaskPhotoBase64;
      document.getElementById("taskPreviewBox").classList.remove("hidden");
    };
  };
  reader.readAsDataURL(file);
}

function clearTaskPhoto() {
  selectedTaskPhotoBase64 = "";
  document.getElementById("taskPreviewBox").classList.add("hidden");
}

// Backend Data Sync
async function loadInitialData() {
  const date = document.getElementById("datePicker").value;
  try {
    const res = await fetch(`${CONFIG.apiEndpoint}?action=getInitialData&date=${date}&user=${CONFIG.currentUser}`);
    const data = await res.json();
    
    globalDateEntries = data.entries || [];
    globalAllEntries = data.allEntries || [];
    
    renderMemories();
    renderPromptStatus(data.prompt);
    renderTaskStatus(data.task);
  } catch (err) {
    console.error("Sync failed:", err);
  }
}

async function loadDateMemories() {
  const date = document.getElementById("datePicker").value;
  try {
    const res = await fetch(`${CONFIG.apiEndpoint}?action=getEntries&date=${date}`);
    const data = await res.json();
    globalDateEntries = data.entries || [];
    globalAllEntries = data.allEntries || [];
    renderMemories();
  } catch (err) {
    console.error("Failed to load date memories:", err);
  }
}

function toggleMemoryView() {
  viewAllMemoriesMode = !viewAllMemoriesMode;
  const btn = document.getElementById("viewAllBtn");
  btn.innerText = viewAllMemoriesMode ? "By Date" : "View All";
  renderMemories();
}

function renderMemories() {
  const feed = document.getElementById("memoryFeed");
  feed.innerHTML = "";

  const entriesToRender = viewAllMemoriesMode ? globalAllEntries : globalDateEntries;

  if (!entriesToRender || entriesToRender.length === 0) {
    feed.innerHTML = `<p style="text-align:center; color: var(--text-sub); font-size: 0.85rem; padding: 20px;">
      ${viewAllMemoriesMode ? "No memories recorded yet!" : "No memories recorded for this date yet."}
    </p>`;
    return;
  }

  entriesToRender.forEach(item => {
    const card = document.createElement("div");
    card.className = "memory-item";
    
    let formattedDate = item.date || "";
    if (item.timestamp) {
      formattedDate = new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }

    card.innerHTML = `
      <header>
        <span><strong>${item.author}</strong> • ${formattedDate}</span>
      </header>
      <p style="white-space: pre-wrap; margin-top: 4px;">${item.text}</p>
      ${item.photo ? `<img src="${item.photo}" alt="Memory photo" loading="lazy">` : ''}
    `;
    feed.appendChild(card);
  });
}

async function saveMemory() {
  const text = document.getElementById("memoryText").value;
  const date = document.getElementById("datePicker").value;
  const btn = document.getElementById("saveMemoryBtn");

  if (!text && !selectedPhotoBase64) return;

  btn.innerText = "Saving...";
  btn.disabled = true;

  const payload = {
    action: "saveEntry",
    date: date,
    user: CONFIG.currentUser,
    text: text,
    photoData: selectedPhotoBase64
  };

  try {
    await fetch(CONFIG.apiEndpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    });

    document.getElementById("memoryText").value = "";
    clearPhoto();
    setTimeout(loadDateMemories, 1000);
  } catch (err) {
    console.error("Save memory error:", err);
  } finally {
    btn.innerText = "Save Memory";
    btn.disabled = false;
  }
}

function renderPromptStatus(status) {
  if (!status) return;
  
  document.getElementById("promptText").innerText = status.question;

  if (status.userAnswer) {
    document.getElementById("promptInputArea").classList.add("hidden");
    document.getElementById("promptOutputArea").classList.remove("hidden");
    document.getElementById("myAnswerDisplay").innerText = status.userAnswer;
    document.getElementById("partnerAnswerDisplay").innerText = status.partnerAnswer;
    document.getElementById("lockStatus").innerText = status.partnerAnswer.includes("🔒") ? "🔒 Waiting" : "🔓 Unlocked";
  } else {
    document.getElementById("promptInputArea").classList.remove("hidden");
    document.getElementById("promptOutputArea").classList.add("hidden");
    document.getElementById("lockStatus").innerText = "🔒 Encrypted";
  }
}

async function submitPrompt() {
  const answer = document.getElementById("promptInput").value;
  const date = document.getElementById("datePicker").value;
  const btn = document.getElementById("promptSubmitBtn");

  if (!answer) return;

  btn.innerText = "Submitting...";
  btn.disabled = true;

  const payload = {
    action: "submitPrompt",
    date: date,
    user: CONFIG.currentUser,
    answer: answer
  };

  try {
    await fetch(CONFIG.apiEndpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    });

    document.getElementById("promptInput").value = "";
    setTimeout(loadInitialData, 1000);
  } catch(err) {
    console.error("Submit prompt error:", err);
  } finally {
    btn.innerText = "Lock In My Answer";
    btn.disabled = false;
  }
}

function renderTaskStatus(task) {
  if (!task) return;

  document.getElementById("taskPromptText").innerHTML = `<strong>Today's Mission:</strong> ${task.taskDescription}`;

  if (task.userCompleted) {
    document.getElementById("taskInputArea").classList.add("hidden");
    document.getElementById("taskResultArea").classList.remove("hidden");
    
    const partnerName = CONFIG.currentUser === "Zaroo" ? "Salma" : "Zaroo";
    document.getElementById("taskLockBadge").innerText = task.partnerCompleted ? "🔓 Unlocked" : `⏳ Pending ${partnerName}`;

    document.getElementById("myTaskDisplay").innerText = task.userNote;
    const myImg = document.getElementById("myTaskPhotoDisplay");
    if (task.userPhoto) {
      myImg.src = task.userPhoto;
      myImg.classList.remove("hidden");
    } else {
      myImg.classList.add("hidden");
    }

    document.getElementById("partnerTaskDisplay").innerText = task.partnerNote;
    const partnerImg = document.getElementById("partnerTaskPhotoDisplay");
    if (task.partnerPhoto) {
      partnerImg.src = task.partnerPhoto;
      partnerImg.classList.remove("hidden");
    } else {
      partnerImg.classList.add("hidden");
    }
  } else {
    document.getElementById("taskInputArea").classList.remove("hidden");
    document.getElementById("taskResultArea").classList.add("hidden");
    document.getElementById("taskLockBadge").innerText = "🔒 Locked";
  }
}

async function submitTask() {
  const note = document.getElementById("taskNoteInput").value;
  const date = document.getElementById("datePicker").value;
  const btn = document.getElementById("taskSubmitBtn");

  if (!note && !selectedTaskPhotoBase64) return;

  btn.innerText = "Submitting...";
  btn.disabled = true;

  const payload = {
    action: "submitTask",
    date: date,
    user: CONFIG.currentUser,
    note: note,
    photoData: selectedTaskPhotoBase64
  };

  try {
    await fetch(CONFIG.apiEndpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    });

    document.getElementById("taskNoteInput").value = "";
    clearTaskPhoto();
    setTimeout(loadInitialData, 1000);
  } catch(err) {
    console.error("Submit task error:", err);
  } finally {
    btn.innerText = "Complete & Lock In Task";
    btn.disabled = false;
  }
}
