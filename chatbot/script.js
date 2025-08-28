// firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGA76Ts_51KAFItYa-HrwV26gHxbp69Ws",
  authDomain: "mybiglibrary-f9988.firebaseapp.com",
  projectId: "mybiglibrary-f9988",
  storageBucket: "mybiglibrary-f9988.firebasestorage.app",
  messagingSenderId: "841203291050",
  appId: "1:841203291050:web:1e061841630d5b5d63d1d3",
  measurementId: "G-BBKVYTGTWY"
};
// Khởi tạo Firebase App
const app = initializeApp(firebaseConfig);
// Xuất đối tượng Firestore ra ngoài để file khác dùng
const db = getFirestore(app);

import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const chatbotToggler = document.querySelector("#chatbot-toggler");
const closeChatbot = document.querySelector("#close-chatbot");
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'vi-VN'; // Đặt ngôn ngữ là tiếng Việt
recognition.interimResults = false;
recognition.maxAlternatives = 1;

let isListening = false;

const API_KEY = "AIzaSyAJcZ4pQ4Oc9h96qii7YlJ1EXUVCW_fQnw";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const userData = { message: null, file: { data: null, mime_type: null } };
const chatHistory = [];
const initialInputHeight = messageInput.scrollHeight;

const speak = (text) => {
  if (window.responsiveVoice && responsiveVoice.voiceSupport()) {
    responsiveVoice.speak(text, "Vietnamese Female");
  } else {
    console.warn("ResponsiveVoice không khả dụng. Dùng fallback.");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    window.speechSynthesis.speak(utterance);
  }
};
// Thêm cache cho kết quả AI
const responseCache = {};

const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

function isBookQuery(message) {
  const lower = message.toLowerCase();
  const bookKeywords = [
    "sách", "tìm sách", "cuốn sách", "giới thiệu sách", "có sách nào",
    "ai viết", "cuốn nào", "thể loại", "tác giả", "truyện"
  ];
  return bookKeywords.some(kw => lower.includes(kw));
}

function getDefaultBotReply(message) {
  const lower = message.toLowerCase().trim();
  if (["hi","hello","xin chào","chào","hey"].includes(lower)) {
    return "Chào bạn! 🙋‍♂️ Mình là trợ lý thư viện thông minh!. Bạn cần tìm sách hay cần mình giúp gì nè?";
  }
  if (lower.includes("cảm ơn")) {
    return "Không có gì đâu! Mình luôn sẵn sàng giúp bạn 😊";
  }
  if (lower.includes("bạn là ai")) {
    return "Mình là trợ lý thư viện thông minh! Bạn cần tìm sách gì nè?";
  }
  return null;
}

async function extractKeywordsFromUserMessage(message) {
  const prompt = `Người dùng hỏi: "${message}"
Hãy trích xuất tối đa 5 từ khóa liên quan đến sách (giữ nguyên cụm từ, phân cách dấu phẩy). Chỉ trả về danh sách từ khóa, không giải thích.`;

  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
  };

  try {
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);
    const text = data.candidates[0].content.parts[0].text.trim();
    const kws = text.split(",").map(k => k.trim().toLowerCase()).slice(0,5);
    if (kws.length > 0) return kws;
    // Nếu Gemini trả về rỗng, dùng fallback
    throw new Error("Empty keywords");
  } catch (err) {
    console.warn("Fallback tách từ khóa thủ công:", err.message);
    const fallback = message
      .toLowerCase()
      .replace(/[^a-zA-ZÀ-ỹ0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);
    return [...new Set(fallback)].slice(0, 10);
  }
}

async function searchBooksInFirebase(keywords) {
  const booksRef = collection(db, "books");
  const searchTerms = [...new Set(keywords)].slice(0, 10);
  console.log("🔎 Firestore search terms:", searchTerms);

  try {
    const q = query(booksRef, where("keywords", "array-contains-any", searchTerms));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    let resultText = "📚 Kết quả tìm được:\n\n";
    snapshot.forEach(doc => {
      const book = doc.data();
      resultText += `• 📘 Tên sách: ${book.title}
      • 🧓 Tác giả: ${book.author}
      • 🔍 Thể loại: (${book.category})\n`;
if (book.location) {
  resultText += `• 📍 Vị trí: ${book.location}\n`;
}
if (book.quantity !== undefined) {
  resultText += `• 📦 Số lượng còn: ${book.quantity} cuốn\n`;
}
// if (book.description) {
//   resultText += `• 📝 Mô tả: ${book.description}\n`;
// }
resultText += `\n`;
    });
    return resultText;
  } catch (err) {
    console.error("Firestore lỗi:", err);
    return null;
  }
}

async function fetchGeminiResponse() {
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: chatHistory }),
  };
  try {
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text.trim();
  } catch (err) {
    console.error("Fallback Gemini lỗi:", err);
    return "Mình chưa hiểu rõ lắm, bạn có thể nói lại không?";
  }
}

async function correctSpellingWithGemini(message) {
  const prompt = `Hãy sửa lỗi chính tả cho câu sau và chỉ trả về câu đã sửa, không giải thích: "${message}"`;
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
  };
  try {
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text.trim();
  } catch (err) {
    console.warn("Không sửa được chính tả, dùng nguyên văn:", err.message);
    return message; // fallback: trả về nguyên văn nếu lỗi
  }
}

// Hàm gộp sửa chính tả và trích xuất từ khóa
async function correctAndExtractKeywords(message) {
  const prompt = `Hãy sửa lỗi chính tả cho câu sau và chỉ trả về câu đã sửa. Sau đó, trích xuất tối đa 5 từ khóa liên quan đến sách (giữ nguyên cụm từ, phân cách dấu phẩy).\nChỉ trả về kết quả theo định dạng:\nCâu đã sửa: <câu>\nTừ khóa: <danh sách từ khóa>\n"${message}"`;
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
  };
  try {
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);
    const text = data.candidates[0].content.parts[0].text.trim();
    // Tách kết quả
    const match = text.match(/Câu đã sửa:(.*)\nTừ khóa:(.*)/s);
    if (match) {
      return {
        corrected: match[1].trim(),
        keywords: match[2].split(",").map(k => k.trim().toLowerCase()).slice(0,5)
      };
    }
    // fallback
    return { corrected: message, keywords: [] };
  } catch (err) {
    console.warn("Không sửa được chính tả hoặc tách từ khóa:", err.message);
    return { corrected: message, keywords: [] };
  }
}

// Hàm lấy trả lời AI có cache
async function getGeminiResponseCached(message) {
  if (responseCache[message]) return responseCache[message];
  const response = await fetchGeminiResponse();
  responseCache[message] = response;
  return response;
}

async function sendMessageToBot(message) {
  const response = await fetch('https://nguyenhoang05-github-io.onrender.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  const data = await response.json();
  if (data.reply) return data.reply;
  throw new Error(data.error || "Lỗi không xác định từ server");
}

// Sửa lại generateBotResponse
const generateBotResponse = async (incomingMessageDiv) => {
  const messageElement = incomingMessageDiv.querySelector(".message-text");
  let apiResponseText = "";
  try {
    let userMsg = userData.message.trim();
    apiResponseText = await sendMessageToBot(userMsg);
  } catch (err) {
    console.error(err);
    apiResponseText = "⚠️ Đã xảy ra lỗi khi xử lý yêu cầu.";
    messageElement.style.color = "#ff0000";
  }
  messageElement.innerText = apiResponseText;
  speak(apiResponseText);
  incomingMessageDiv.classList.remove("thinking");
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
};

const handleOutgoingMessage = (e) => {
  e.preventDefault();
  userData.message = messageInput.value.trim();
  messageInput.value="";
  messageInput.dispatchEvent(new Event("input"));

  const content = `<div class="message-text"></div>${
    userData.file.data
      ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" />`
      : ""
  }`;
  const outDiv = createMessageElement(content, "user-message");
  outDiv.querySelector(".message-text").textContent = userData.message;
  chatBody.appendChild(outDiv);
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

  setTimeout(() => {
    const thinkingContent = `
  <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
    <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"/>
  </svg>
  <div class="message-text"><div class="thinking-indicator">
    <div class="dot"></div><div class="dot"></div><div class="dot"></div>
  </div></div>`;
    const inDiv = createMessageElement(thinkingContent, "bot-message", "thinking");
    chatBody.appendChild(inDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    generateBotResponse(inDiv);
  }, 600);
};

messageInput.addEventListener("keydown", e => {
  if (e.key==="Enter" && !e.shiftKey && e.target.value.trim() && window.innerWidth>768) {
    handleOutgoingMessage(e);
  }
});
messageInput.addEventListener("input", () => {
  messageInput.style.height = `${initialInputHeight}px`;
  messageInput.style.height = `${messageInput.scrollHeight}px`;
});
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const base64 = e.target.result.split(",")[1];
    userData.file = { data: base64, mime_type: file.type };
    fileInput.value="";
  };
  reader.readAsDataURL(file); 
});
let picker = null;
const emojiBtn = document.getElementById('emoji-picker');

emojiBtn.addEventListener('click', (e) => {
  e.preventDefault();
  // Nếu picker chưa có, tạo mới
  if (!picker) {
    picker = document.createElement('div');
    picker.style.position = "absolute";
    picker.style.zIndex = 9999;
    document.body.appendChild(picker);

    EmojiMart.renderPicker(picker, {
      theme: "light",
      onEmojiSelect: (emoji) => {
        const { selectionStart: start, selectionEnd: end } = messageInput;
        messageInput.setRangeText(emoji.native, start, end, "end");
        messageInput.focus();
      }
    });
  }
  // Toggle hiển thị picker
  if (picker.style.display === "none" || !picker.style.display) {
    const rect = emojiBtn.getBoundingClientRect();
    picker.style.left = rect.left + "px";
    picker.style.top = (rect.bottom + 5) + "px";
    picker.style.display = "block";
  } else {
    picker.style.display = "none";
  }
});

// Ẩn picker khi click ra ngoài
document.addEventListener('click', (e) => {
  if (picker && !picker.contains(e.target) && e.target !== emojiBtn) {
    picker.style.display = "none";
  }
});
document.addEventListener('mousedown', (e) => {
  // Nếu click vào picker hoặc emojiBtn thì không ẩn
  if (picker && !picker.contains(e.target) && e.target !== emojiBtn) {
    picker.style.display = "none";
  }
});
sendMessageButton.addEventListener("click", handleOutgoingMessage);
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
closeChatbot.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  messageInput.value = transcript;
  messageInput.dispatchEvent(new Event('input')); // Cập nhật chiều cao input
  handleOutgoingMessage(new Event('submit')); // Gửi tin nhắn tự động
  isListening = false;
};

recognition.onerror = (event) => {
  console.error("Lỗi nhận diện giọng nói:", event.error);
  alert("Không thể nhận diện giọng nói. Vui lòng thử lại!");
  isListening = false;
};

document.querySelector('#voice-input').addEventListener('click', () => {
  if (!isListening) {
    isListening = true;
    recognition.start();
    messageInput.placeholder = "Đang nghe...";
  } else {
    recognition.stop();
    isListening = false;
    messageInput.placeholder = "Nhập tin nhắn...";
  }
});