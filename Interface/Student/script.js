function alignChatbotPopup() {
  const toggler = document.getElementById('chatbot-toggler');
  const popup = document.getElementById('chatbotIframe');
  if (!toggler || !popup) return;

  const rect = toggler.getBoundingClientRect();
  const distanceFromBottom = window.innerHeight - rect.bottom;
  // Đặt popup cách toggler 20px
  popup.style.bottom = (distanceFromBottom + 20) + 'px';
  popup.style.right = '20px'; // Giữ nguyên right
}

// Gọi hàm này khi hiển thị popup hoặc khi resize window
window.addEventListener('resize', alignChatbotPopup);
document.getElementById('chatbot-toggler').addEventListener('click', () => {
  const popup = document.getElementById('chatbotIframe');
  popup.style.display = (popup.style.display === 'none' || !popup.style.display) ? 'block' : 'none';
  alignChatbotPopup();
});