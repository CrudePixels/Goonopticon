// Theme logic shared across sidebar and popup

export function ApplyTheme(selectedTheme = "default")
{
    const themeClass = `${selectedTheme}-theme`;
    document.body.classList.remove("default-theme", "dark-theme", "light-theme");
    document.body.classList.add(themeClass);

    const sidebar = document.getElementById('podawful-sidebar');
    if (sidebar)
    {
        sidebar.classList.remove('default-theme', 'dark-theme', 'light-theme');
        sidebar.classList.add(themeClass);
    }
}