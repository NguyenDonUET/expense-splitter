export const THEME_STORAGE_KEY = "expense-splitter-theme";

export const themeInitScript = `(function(){try{var theme=localStorage.getItem("${THEME_STORAGE_KEY}");if(theme==="light"||theme==="dark"){document.documentElement.setAttribute("data-theme",theme);}}catch(e){}})();`;
