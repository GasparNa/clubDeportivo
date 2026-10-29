/** Script bloqueante para evitar FOUC. Insertar en <head> del root layout. */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("theme");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=(s==="dark"||s==="light")?s:(d?"dark":"light");var e=document.documentElement;e.dataset.theme=t;e.classList.toggle("dark",t==="dark");}catch(e){}})();`;
