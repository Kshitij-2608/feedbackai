document.addEventListener("DOMContentLoaded", () => {
    const chatContainer = document.getElementById("chat-container");
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user-input");
    const typingIndicator = document.getElementById("typing-indicator");
    const imageUpload = document.getElementById("image-upload");
    const previewContainer = document.getElementById("preview-container");
    const imagePreview = document.getElementById("image-preview");
    const removeImageBtn = document.getElementById("remove-image-btn");

    let currentBase64Image = null;

    // Generate a fresh session ID on every page reload
    let sessionId = crypto.randomUUID();

    // append to dom
    function appendMessage(text, sender, imageUrl = null) {
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message");
        msgDiv.classList.add(sender === "bot" ? "bot-message" : "user-message");
        
        let htmlContent = "";
        if (imageUrl) {
            htmlContent += `<img src="${imageUrl}" style="max-width:100%; border-radius:12px; margin-bottom: 8px;"><br/>`;
        }
        
        let processedText = text;
        // Parse Media Tags
        processedText = processedText.replace(/\[IMAGE: (.+?)\]/g, '<img src="$1" class="media-generation" alt="Generated Image" />');
        processedText = processedText.replace(/\[VIDEO: (.+?)\]/g, '<div class="media-generation" style="padding:10px;text-align:center;">🎬 $1</div>');
        processedText = processedText.replace(/\[AUDIO: (.+?)\]/g, '<div class="media-generation" style="padding:10px;text-align:center;">🎵 $1</div>');
        
        // Convert newlines to breaks to not override custom innerHTML safely
        htmlContent += processedText.replace(/\n/g, '<br/>');
        msgDiv.innerHTML = htmlContent;
        
        chatContainer.appendChild(msgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // show typing indicator
    function showTyping() {
        typingIndicator.classList.remove("hidden");
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function hideTyping() {
        typingIndicator.classList.add("hidden");
    }

    // Image Upload Handlers
    imageUpload.addEventListener("change", function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                currentBase64Image = e.target.result;
                imagePreview.src = currentBase64Image;
                previewContainer.classList.remove("hidden");
            };
            reader.readAsDataURL(file);
        }
    });

    removeImageBtn.addEventListener("click", function () {
        currentBase64Image = null;
        imageUpload.value = "";
        previewContainer.classList.add("hidden");
    });

    // init chat session
    async function initChat() {
        try {
            const res = await fetch(`/api/chat/init?session_id=${sessionId}`);
            const data = await res.json();
            appendMessage(data.message, "bot");
        } catch(e) {
            console.error("Failed to init chat", e);
        }
    }

    // send message event listener
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = userInput.value.trim();
        if (!text && !currentBase64Image) return;

        // Immediately append user message
        const imgToSend = currentBase64Image;
        appendMessage(text, "user", imgToSend);
        userInput.value = "";
        
        // Clear UI image
        currentBase64Image = null;
        imageUpload.value = "";
        previewContainer.classList.add("hidden");

        showTyping();
        
        // POST to backend
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    session_id: sessionId, 
                    message: text,
                    image_base64: imgToSend
                })
            });
            const data = await res.json();
            hideTyping();
            appendMessage(data.message, "bot");
        } catch (e) {
            hideTyping();
            appendMessage("Sorry, network error.", "bot");
        }
    });

    // Start Chat!
    initChat();
});
