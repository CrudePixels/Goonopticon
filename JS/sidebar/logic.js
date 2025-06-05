// Version: 1.0.0

export function SafeParse(Str, Fallback)
{
    try
    {
        return JSON.parse(Str) || Fallback;
    }
    catch
    {
        return Fallback;
    }
}

export function GenerateNoteId()
{
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function GetTimecode(Seconds)
{
    const H = Math.floor(Seconds / 3600);
    const M = Math.floor((Seconds % 3600) / 60);
    const S = Math.floor(Seconds % 60);
    return H > 0
        ? `${H}:${M.toString().padStart(2, "0")}:${S.toString().padStart(2, "0")}`
        : `${M}:${S.toString().padStart(2, "0")}`;
}

export function ParseTime(Str)
{
    if (!Str) return 0;
    const Parts = Str.split(":").map(Number);
    if (Parts.length === 3) return Parts[0] * 3600 + Parts[1] * 60 + Parts[2];
    if (Parts.length === 2) return Parts[0] * 60 + Parts[1];
    return Number(Str) || 0;
}

export function GetAllTags(Notes)
{
    const Tags = new Set();
    Notes.forEach(N => (N.tags || []).forEach(T => Tags.add(T)));
    return Array.from(Tags);
}

export function IsTimeClose(current, t) {
    return Math.abs(current - t) < 5;
}