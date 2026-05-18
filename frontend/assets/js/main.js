window.addEventListener("load", () => {
  const loading = document.getElementById("loading-screen");
  if (!loading) return;
  setTimeout(() => {
    loading.style.opacity = "0";
    loading.style.visibility = "hidden";
  }, 700);
});
