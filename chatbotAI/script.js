// firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCQHfCHYaNsrqF3WxnYXzBupYt1JepSAgE",
  authDomain: "nckh-61911.firebaseapp.com",
  databaseURL: "https://nckh-61911-default-rtdb.firebaseio.com",
  projectId: "nckh-61911",
  storageBucket: "nckh-61911.firebasestorage.app",
  messagingSenderId: "81447288463",
  appId: "1:81447288463:web:5448b1cfd69c5d60c77afa",
  measurementId: "G-S931M5BS81",
};
// Khởi tạo Firebase App
const app = initializeApp(firebaseConfig);
// Xuất đối tượng Firestore ra ngoài để file khác dùng

import {
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
  getDatabase,
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const db = getFirestore(app);
const rtdb = getDatabase(app);
const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const chatbotToggler = document.querySelector("#chatbot-toggler");
const closeChatbot = document.querySelector("#close-chatbot");
const recognition = new (window.SpeechRecognition ||
  window.webkitSpeechRecognition)();
recognition.lang = "vi-VN"; // Đặt ngôn ngữ là tiếng Việt
recognition.interimResults = false;
recognition.maxAlternatives = 1;

let isListening = false;

const API_KEY = "AIzaSyA9ENxqcWo6knRdkKa05SkgnYviY58iRNQ";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

const userData = { message: null, file: { data: null, mime_type: null } };
const chatHistory = [];
const initialInputHeight = messageInput.scrollHeight;

const sessionState = {
  mssv: null,
  awaitingMSSV: false,
};
let lastIntent = null;

const speak = (text) => {
  if (window.responsiveVoice && responsiveVoice.voiceSupport()) {
    responsiveVoice.speak(text, "Vietnamese Female");
  } else {
    console.warn("ResponsiveVoice không khả dụng. Dùng fallback.");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
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
    "sách",
    "tìm sách",
    "cuốn sách",
    "giới thiệu sách",
    "có sách nào",
    "ai viết",
    "cuốn nào",
    "thể loại",
    "tác giả",
    "truyện",
  ];
  return bookKeywords.some((kw) => lower.includes(kw));
}
// --- BẮT ĐẦU ĐOẠN CODE CẦN THÊM ---

async function getAllCategoriesAndAuthors() {
  const booksRef = collection(db, "books");
  try {
    const snapshot = await getDocs(booksRef);
    const genresSet = new Set();
    const authorsSet = new Set();

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.genre) genresSet.add(data.genre.trim()); // CHẮC CHẮN dùng genre
      if (data.author) authorsSet.add(data.author.trim());
    });

    return {
      categories: Array.from(genresSet).sort(),
      authors: Array.from(authorsSet).sort(),
    };
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu:", err);
    return { categories: [], authors: [] };
  }
}

// --- KẾT THÚC ĐOẠN CODE CẦN THÊM ---
function getDefaultBotReply(message) {
  const lower = message.toLowerCase().trim();

  // 1. Chào hỏi
  const greetings = ["hi", "hello", "xin chào", "chào", "hey"];
  if (greetings.includes(lower)) {
    return "Chào bạn! 🙋‍♂️ Mình là trợ lý thư viện thông minh. Bạn cần tìm sách hay cần mình giúp gì nè?";
  }

  // 2. Cảm ơn
  if (lower.includes("cảm ơn")) {
    return "Không có gì đâu! Mình luôn sẵn sàng giúp bạn 😊";
  }

  // 3. Hỏi về bot
  if (lower.includes("bạn là ai") || lower.includes("bạn làm gì")) {
    return "Mình là trợ lý thư viện thông minh! Bạn cần tìm sách gì nè?";
  }

  // 4. Câu trả lời cố định (ưu tiên kiểm tra trước để không bị nhầm)
  if (lower.includes("thời gian làm việc")) {
    return "🕒 Thư viện mở cửa từ 8h00 đến 20h00 các ngày trong tuần (trừ Chủ nhật).";
  }

  if (lower.includes("quy định mượn sách") || lower.includes("mượn sách")) {
    return "📖 Bạn có thể mượn tối đa 5 cuốn/lần, thời hạn 90 ngày. Vui lòng trả đúng hạn để không bị phạt.";
  }

  // 5. Hỏi về thể loại
  if (
    lower.includes("thể loại") ||
    lower.includes("loại sách") ||
    lower.includes("sách gì")
  ) {
    return "show_categories";
  }

  // 6. Hỏi về tác giả
  if (
    lower.includes("tác giả tiêu biểu") ||
    lower.includes("có những tác giả") ||
    lower === "tác giả" ||
    lower === "tác giả nổi bật"
  ) {
    return "show_authors";
  }

  // ✅ 7. Check nâng cao qua matchIntent() – BỔ SUNG NÀY LÀM SAU CÙNG
  const detectedIntent = matchIntent(message);
  if (
    ["get_user_info", "count_books_borrowed", "get_unreturned_books"].includes(
      detectedIntent
    )
  ) {
    return detectedIntent;
  }

  return null; // Không khớp gì cả → để Gemini xử lý
}

async function extractKeywordsFromUserMessage(message) {
  const prompt = `Người dùng hỏi: "${message}"
Hãy trích xuất tối đa 5 từ khóa liên quan đến sách (giữ nguyên cụm từ, phân cách dấu phẩy). Chỉ trả về danh sách từ khóa, không giải thích.`;

  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  };

  try {
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);
    const text = data.candidates[0].content.parts[0].text.trim();
    const kws = text
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .slice(0, 5);
    if (kws.length > 0) return kws;
    // Nếu Gemini trả về rỗng, dùng fallback
    throw new Error("Empty keywords");
  } catch (err) {
    console.warn("Fallback tách từ khóa thủ công:", err.message);
    const fallback = message
      .toLowerCase()
      .replace(/[^a-zA-ZÀ-ỹ0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);
    return [...new Set(fallback)].slice(0, 10);
  }
}

async function searchBooksInFirebase(keywords) {
  const booksRef = collection(db, "books");
  const searchTerms = [...new Set(keywords)].slice(0, 10);
  console.log("🔎 Firestore search terms:", searchTerms);

  try {
    const q = query(
      booksRef,
      where("keywords", "array-contains-any", searchTerms)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    let resultText = "📚 Kết quả tìm được:\n\n";
    snapshot.forEach((doc) => {
      const book = doc.data();
      resultText += `• 📘 Tên sách: ${book.title}
      • 🧓 Tác giả: ${book.author}
      • 🔍 Thể loại: (${book.genre})\n`;
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
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
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
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
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
        keywords: match[2]
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .slice(0, 5),
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

// --- HÀM generateBotResponse ---
const generateBotResponse = async (incomingMessageDiv) => {
  const messageElement = incomingMessageDiv.querySelector(".message-text");
  let apiResponseText = "";

  try {
    let userMsg = userData.message.trim();

    // Gộp sửa chính tả và trích xuất từ khóa
    const { corrected, keywords } = await correctAndExtractKeywords(userMsg);
    chatHistory.push({ role: "user", parts: [{ text: corrected }] });

    // Ưu tiên trả lời theo mẫu hoặc intent
    const defaultReply = getDefaultBotReply(corrected);

    // 👉 Nếu đang chờ người dùng nhập MSSV
    if (sessionState.awaitingMSSV) {
      if (/^[A-Z0-9]{10}$/i.test(corrected)) {
        sessionState.mssv = corrected;
        sessionState.awaitingMSSV = false;

        if (lastIntent === "get_user_info") {
          apiResponseText = await getStudentInfoByMSSV(sessionState.mssv);
        } else if (lastIntent === "count_books_borrowed") {
          apiResponseText = await countBooksBorrowed(sessionState.mssv);
        } else if (lastIntent === "get_unreturned_books") {
          apiResponseText = await getUnreturnedBooks(sessionState.mssv);
        }
      } else {
        apiResponseText =
          "⚠️ MSSV không hợp lệ. Vui lòng kiểm tra lại và nhập đúng MSSV (gồm 10 ký tự).";
        messageElement.innerText = apiResponseText;
        speak(apiResponseText);
        incomingMessageDiv.classList.remove("thinking");
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
        return;
      }

      chatHistory.push({ role: "model", parts: [{ text: apiResponseText }] });
      messageElement.innerText = apiResponseText;
      speak(apiResponseText);
      incomingMessageDiv.classList.remove("thinking");
      chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
      return;
    }

    // 👉 Nếu là yêu cầu liên quan đến thông tin đọc giả
    if (
      [
        "get_user_info",
        "count_books_borrowed",
        "get_unreturned_books",
      ].includes(defaultReply)
    ) {
      if (!sessionState.mssv) {
        apiResponseText =
          "🎓 Bạn vui lòng nhập mã số sinh viên (MSSV) để mình tra cứu thông tin nhé!";
        sessionState.awaitingMSSV = true;
        lastIntent = defaultReply;
      } else {
        if (defaultReply === "get_user_info") {
          apiResponseText = await getStudentInfoByMSSV(sessionState.mssv);
        } else if (defaultReply === "count_books_borrowed") {
          apiResponseText = await countBooksBorrowed(sessionState.mssv);
        } else if (defaultReply === "get_unreturned_books") {
          apiResponseText = await getUnreturnedBooks(sessionState.mssv);
        }
      }

      // ✅ Nếu MSSV cũ không hợp lệ → reset để tránh lặp lỗi
      if (
        apiResponseText.includes("Không tìm thấy") ||
        apiResponseText.includes("Không có lịch sử") ||
        apiResponseText.includes("lỗi khi truy xuất")
      ) {
        sessionState.mssv = null;
        lastIntent = null;
      }

      chatHistory.push({ role: "model", parts: [{ text: apiResponseText }] });
      messageElement.innerText = apiResponseText;
      speak(apiResponseText);
      incomingMessageDiv.classList.remove("thinking");
      chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
      return;
    }

    // 👉 Quick replies: show categories / authors
    if (defaultReply === "show_categories") {
      const { categories: genres } = await getAllCategoriesAndAuthors();
      apiResponseText =
        genres.length > 0
          ? `📚 Thư viện hiện có các thể loại (genre):\n\n• ${genres.join(
              "\n• "
            )}`
          : "😅 Xin lỗi, chưa có dữ liệu về thể loại trong hệ thống.";
    } else if (defaultReply === "show_authors") {
      const { authors } = await getAllCategoriesAndAuthors();
      apiResponseText =
        authors.length > 0
          ? `✍️ Các tác giả tiêu biểu:\n\n• ${authors.join("\n• ")}`
          : "😅 Xin lỗi, chưa có dữ liệu về tác giả trong hệ thống.";
    } else if (defaultReply) {
      // Các câu trả lời tĩnh: cảm ơn, chào hỏi...
      apiResponseText = defaultReply;
    } else if (isBookQuery(corrected) && keywords.length > 0) {
      // Tìm sách theo từ khóa
      const reply = await searchBooksInFirebase(keywords);
      apiResponseText = reply || "😔 Không tìm thấy sách nào phù hợp.";
    } else {
      // Fallback: nhờ Gemini trả lời tự do
      apiResponseText = await getGeminiResponseCached(corrected);
    }

    chatHistory.push({ role: "model", parts: [{ text: apiResponseText }] });
  } catch (err) {
    console.error("⚠️ Lỗi xử lý generateBotResponse:", err);
    apiResponseText = "⚠️ Đã xảy ra lỗi khi xử lý yêu cầu.";
    messageElement.style.color = "#ff0000";
  }

  // 🖥️ Hiển thị kết quả cuối cùng
  messageElement.innerText = apiResponseText;
  speak(apiResponseText);
  incomingMessageDiv.classList.remove("thinking");
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
};
// --- KẾT THÚC SỬA ĐỔI HÀM generateBotResponse ---

const handleOutgoingMessage = (e) => {
  e.preventDefault();
  userData.message = messageInput.value.trim();
  messageInput.value = "";
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
      <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50"><path d="..."/></svg>
      <div class="message-text"><div class="thinking-indicator">
        <div class="dot"></div><div class="dot"></div><div class="dot"></div>
      </div></div>`;
    const inDiv = createMessageElement(
      thinkingContent,
      "bot-message",
      "thinking"
    );
    chatBody.appendChild(inDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    generateBotResponse(inDiv);
  }, 600);
};

messageInput.addEventListener("keydown", (e) => {
  if (
    e.key === "Enter" &&
    !e.shiftKey &&
    e.target.value.trim() &&
    window.innerWidth > 768
  ) {
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
  reader.onload = (e) => {
    const base64 = e.target.result.split(",")[1];
    userData.file = { data: base64, mime_type: file.type };
    fileInput.value = "";
  };
  reader.readAsDataURL(file);
});
const picker = new EmojiMart.Picker({
  theme: "light",
  skinTonePosition: "none",
  preview: "none",
  onEmojiSelect: (emoji) => {
    const { selectionStart: start, selectionEnd: end } = messageInput;
    messageInput.setRangeText(emoji.native, start, end, "end");
    messageInput.focus();
  },
  onClickOutside: (e) => {
    if (e.target.id === "emoji-picker")
      document.body.classList.toggle("show-emoji-picker");
    else document.body.classList.remove("show-emoji-picker");
  },
});
document.querySelector(".chat-form").appendChild(picker);
sendMessageButton.addEventListener("click", handleOutgoingMessage);
document
  .querySelector("#file-upload")
  .addEventListener("click", () => fileInput.click());
chatbotToggler.addEventListener("click", () =>
  document.body.classList.toggle("show-chatbot")
);
closeChatbot.addEventListener("click", () =>
  document.body.classList.remove("show-chatbot")
);
recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  messageInput.value = transcript;
  messageInput.dispatchEvent(new Event("input")); // Cập nhật chiều cao input
  handleOutgoingMessage(new Event("submit")); // Gửi tin nhắn tự động
  isListening = false;
};

recognition.onerror = (event) => {
  console.error("Lỗi nhận diện giọng nói:", event.error);
  alert("Không thể nhận diện giọng nói. Vui lòng thử lại!");
  isListening = false;
};

document.querySelector("#voice-input").addEventListener("click", () => {
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

// ===== QUICK PROMPT HANDLER =====
document.querySelectorAll(".quick-prompt").forEach((button) => {
  button.addEventListener("click", () => {
    const promptText = button.dataset.prompt;
    console.log("Quick prompt fired:", promptText); // Kiểm tra nhanh trong console

    // Hiển thị tin nhắn của người dùng như khi gõ tay
    const outDiv = createMessageElement(
      `<div class="message-text">${promptText}</div>`,
      "user-message"
    );
    chatBody.appendChild(outDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    // Cập nhật userData.message để generateBotResponse() dùng
    userData.message = promptText;

    // Tạo indicator "bot đang suy nghĩ"
    const thinkingContent = `
      <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50"><path d="..."/></svg>
      <div class="message-text"><div class="thinking-indicator">
        <div class="dot"></div><div class="dot"></div><div class="dot"></div>
      </div></div>`;
    const inDiv = createMessageElement(
      thinkingContent,
      "bot-message",
      "thinking"
    );
    chatBody.appendChild(inDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    // Gọi generateBotResponse() để xử lý toàn bộ logic trả lời
    generateBotResponse(inDiv);
  });
});
// ===== NHẬN DIỆN Ý ĐỊNH NGƯỜI DÙNG =====
function matchIntent(message) {
  const lower = message.toLowerCase();

  const intents = {
    get_user_info: [
      "tôi là ai",
      "tài khoản của tôi",
      "thông tin cá nhân",
      "tôi thuộc lớp",
      "email của tôi",
      "xem thông tin",
      "tra cứu thông tin",
      "biết thông tin của tôi",
      "tôi cần tra cứu",
      "tôi cần xem thông tin",
      "thông tin của mình",
      "xem lại thông tin cá nhân",
    ],
    count_books_borrowed: [
      "mượn mấy",
      "đọc bao nhiêu",
      "lịch sử mượn",
      "mượn bao nhiêu",
      "đã đọc mấy cuốn",
      "từng mượn",
      "tôi đã mượn sách chưa",
      "đã mượn bao nhiêu sách",
      "sách tôi đã đọc",
      "bao nhiêu cuốn tôi từng mượn",
      "tôi có đọc sách nào không",
      "tôi đã mượn bao nhiêu cuốn",
      "tôi có từng mượn sách không",
      "tôi đã mượn mấy cuốn",
      "cho biết số sách đã mượn",
      "tôi đã mượn những gì",
    ],
    get_unreturned_books: [
      "chưa trả",
      "nợ sách nào",
      "đang mượn",
      "quá hạn",
      "giữ sách",
      "còn sách chưa trả",
      "tôi còn giữ sách không",
      "tôi còn cuốn nào chưa trả",
      "có sách nào tôi chưa trả không",
      "tôi có đang mượn sách nào không",
      "sách chưa hoàn trả",
      "tôi còn mượn sách không",
      "sách nào chưa trả",
      "tôi có bị trễ hạn không",
      "còn nợ sách",
      "tôi chưa trả sách nào",
    ],
  };

  for (const intent in intents) {
    if (intents[intent].some((keyword) => lower.includes(keyword))) {
      return intent;
    }
  }

  return "none";
}
// ===== Trả về thông tin người dùng dựa trên mssv =====
const getStudentInfoByMSSV = async (mssv) => {
  try {
    const snapshot = await get(ref(rtdb, "users"));
    if (!snapshot.exists()) {
      return `❌ Không tìm thấy sinh viên nào với MSSV "${mssv}".`;
    }

    const users = snapshot.val();

    for (const uid in users) {
      const user = users[uid];
      if (user.mssv?.toUpperCase() === mssv.toUpperCase()) {
        return `🧑‍🎓 Thông tin tài khoản:
• Họ tên: ${user.username}
• MSSV: ${user.mssv}
• Lớp: ${user.class}
• Email: ${user.email}`;
      }
    }

    return `❌ Không tìm thấy sinh viên nào với MSSV "${mssv}".`;
  } catch (error) {
    console.error("Lỗi truy vấn thông tin sinh viên:", error);
    return "⚠️ Đã xảy ra lỗi khi truy vấn thông tin sinh viên.";
  }
};

// ===== KẾT THÚC HÀM getStudentInfoByMSSV =====

// Hàm đếm tổng số sách đã mượn và liệt kê sách đang mượn
async function countBooksBorrowed(mssv) {
  try {
    const snapshot = await get(ref(rtdb, "history"));
    if (!snapshot.exists()) {
      return "Không tìm thấy dữ liệu lịch sử mượn sách.";
    }

    const data = snapshot.val();
    let total = 0;
    const currentlyBorrowed = [];

    for (const key in data) {
      const record = data[key];

      if (
        record.studentCode &&
        record.studentCode.toUpperCase() === mssv.toUpperCase()
      ) {
        total++;

        // Nếu chưa trả thì đưa vào danh sách
        if (record.status && record.status.toLowerCase() !== "đã trả") {
          currentlyBorrowed.push(
            `📘 ${record.bookName} (mượn ngày ${record.borrowDate})`
          );
        }
      }
    }

    if (total === 0) {
      return "📚 Bạn chưa mượn cuốn sách nào.";
    }

    let response = `📖 Bạn đã từng mượn ${total} cuốn sách.`;

    if (currentlyBorrowed.length > 0) {
      response += `\n\n📕 Những cuốn bạn đang mượn:\n${currentlyBorrowed.join(
        "\n"
      )}`;
    } else {
      response += `\n\n✅ Hiện bạn không có cuốn nào đang mượn.`;
    }

    return response;
  } catch (error) {
    console.error("❌ Lỗi khi đếm số sách đã mượn:", error);
    return "⚠️ Đã xảy ra lỗi khi kiểm tra lịch sử mượn sách.";
  }
}
// ===== KẾT THÚC HÀM countBooksBorrowed =====

// Hàm lấy danh sách sách chưa trả theo MSSV
async function getUnreturnedBooks(mssv) {
  try {
    const snapshot = await get(ref(rtdb, "history"));
    if (!snapshot.exists()) {
      return "Không tìm thấy dữ liệu lịch sử mượn sách.";
    }

    const data = snapshot.val();
    const booksNotReturned = [];

    for (const key in data) {
      const record = data[key];
      if (
        record.studentCode &&
        record.studentCode.toUpperCase() === mssv.toUpperCase() &&
        record.status.toLowerCase() !== "đã trả"
      ) {
        booksNotReturned.push(
          `📕 ${record.bookName} (Mượn ngày ${record.borrowDate})`
        );
      }
    }

    if (booksNotReturned.length === 0) {
      return "✅ Bạn không có sách nào chưa trả.";
    }

    return `📌 Bạn còn những cuốn này chưa trả nè:\n${booksNotReturned.join(
      "\n"
    )}`;
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách sách chưa trả:", error);
    return "⚠️ Đã xảy ra lỗi khi kiểm tra sách chưa trả.";
  }
}
