export function LogDev(Message, Type = "info")
{
    // Always log to the console
    if (Type === "error")
    {
        console.error("[DevLog]", Message);
    } else
    {
        console.log("[DevLog]", Message);
    }

    // Always log to storage (dev log)
    try
    {
        // Prefer chrome.storage.local if available
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local)
        {
            chrome.storage.local.get(["PodAwful::DevLog"], (Result) =>
            {
                let DevLog = Array.isArray(Result["PodAwful::DevLog"]) ? Result["PodAwful::DevLog"] : [];
                DevLog.push({
                    time: new Date().toISOString(),
                    action: Message,
                    type: Type
                });
                if (DevLog.length > 100) DevLog.shift();
                chrome.storage.local.set({ "PodAwful::DevLog": DevLog });
            });
        } else
        {
            let DevLog = JSON.parse(localStorage.getItem("PodAwful::DevLog") || "[]");
            DevLog.push({
                time: new Date().toISOString(),
                action: Message,
                type: Type
            });
            if (DevLog.length > 100) DevLog.shift();
            localStorage.setItem("PodAwful::DevLog", JSON.stringify(DevLog));
        }
    } catch (Err)
    {
        // Log storage errors to the console
        console.error("[DevLog] Logging to storage failed:", Err, Message);
    }
}