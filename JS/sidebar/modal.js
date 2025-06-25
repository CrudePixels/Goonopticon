export function showInputModal({ title, label, value = "", placeholder = "", type = "text", validate })
{
    return new Promise((resolve) =>
    {
        document.getElementById("podawful-generic-modal")?.remove();

        const modal = document.createElement("div");
        modal.id = "podawful-generic-modal";
        modal.className = "podawful-modal";
        modal.tabIndex = -1;
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('role', 'dialog');

        const box = document.createElement("div");
        box.className = "podawful-modal-box";
        box.innerHTML = `<h3>${title}</h3>
            <label>${label}</label>
            <input type="${type}" value="${value}" placeholder="${placeholder}" style="width:100%;margin:8px 0 16px 0;" />
            <div id="modal-error" style="color:#c00;display:none;margin-bottom:8px;"></div>
            <div style="text-align:right;">
                <button class="podawful-btn" id="modalCancel">Cancel</button>
                <button class="podawful-btn" id="modalOk">OK</button>
            </div>`;

        modal.appendChild(box);
        document.body.appendChild(modal);

        const input = box.querySelector("input");
        const errorDiv = box.querySelector("#modal-error");
        input.focus();

        function cleanup(val)
        {
            modal.remove();
            resolve(val);
        }

        function handleOk()
        {
            const val = input.value;
            if (validate)
            {
                const result = validate(val);
                if (result !== true)
                {
                    errorDiv.textContent = typeof result === "string" ? result : "Invalid input.";
                    errorDiv.style.display = "block";
                    input.style.borderColor = "#c00";
                    return;
                }
            }
            cleanup(val);
        }

        box.querySelector("#modalCancel").onclick = () => cleanup(null);
        box.querySelector("#modalOk").onclick = handleOk;

        input.addEventListener("keydown", (e) =>
        {
            if (e.key === "Enter") handleOk();
            if (e.key === "Escape") cleanup(null);
        });

        modal.addEventListener("click", (e) =>
        {
            if (e.target === modal) cleanup(null);
        });
    });
}

export function showConfirmModal({ title, message, okText = "Delete", cancelText = "Cancel" })
{
    return new Promise((resolve) =>
    {
        document.getElementById("podawful-generic-modal")?.remove();

        const modal = document.createElement("div");
        modal.id = "podawful-generic-modal";
        modal.className = "podawful-modal";
        modal.tabIndex = -1;
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('role', 'dialog');

        const box = document.createElement("div");
        box.className = "podawful-modal-box";
        box.innerHTML = `<h3>${title}</h3>
            <div style="margin-bottom:18px;">${message}</div>
            <div style="text-align:right;">
                <button class="podawful-btn" id="modalCancel">${cancelText}</button>
                <button class="podawful-btn" id="modalOk" style="background:#c00;color:#fff;border-color:#c00;">${okText}</button>
            </div>`;

        modal.appendChild(box);
        document.body.appendChild(modal);

        function cleanup(val)
        {
            modal.remove();
            resolve(val);
        }

        box.querySelector("#modalCancel").onclick = () => cleanup(false);
        box.querySelector("#modalOk").onclick = () => cleanup(true);

        modal.addEventListener("keydown", (e) =>
        {
            if (e.key === "Escape") cleanup(false);
        });
        modal.addEventListener("click", (e) =>
        {
            if (e.target === modal) cleanup(false);
        });
    });
}