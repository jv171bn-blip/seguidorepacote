// Helper functions to preserve UTM parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const paramObj = {};
    for (const [key, value] of params) {
        paramObj[key] = value;
    }
    return paramObj;
}

function buildUrlWithParams(baseUrl) {
    const params = getUrlParams();
    if (Object.keys(params).length === 0) {
        return baseUrl;
    }
    const url = new URL(baseUrl, window.location.origin);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    return url.toString();
}

function goToChat() {
    window.location.href = buildUrlWithParams('chat.html');
}

function toggleSaibaMais() {
  const content=document.getElementById('saibaMaisContent');
  const icon=document.getElementById('saibaMaisIcon');
  if(content.style.display==='none' || content.style.display===''){
    content.style.display='block';
    icon.classList.remove('fa-chevron-down');
    icon.classList.add('fa-chevron-up');
  }else{
    content.style.display='none';
    icon.classList.remove('fa-chevron-up');
    icon.classList.add('fa-chevron-down');
  }
}

document.addEventListener("DOMContentLoaded",function(){
  setTimeout(function(){
    document.getElementById("loadingScreen").style.display="none";
    document.getElementById("mainContent").style.display="block";
  },500);
  // Sidebar toggle
  var hamburger = document.querySelector(".movebrasil-navbar .hamburger");
  var sidebar = document.getElementById("mobileSidebar");
  var overlay = document.getElementById("sidebarOverlay");
  var closeBtn = document.getElementById("sidebarClose");
  function openSidebar(){sidebar.classList.add("open");overlay.classList.add("show");}
  function closeSidebar(){sidebar.classList.remove("open");overlay.classList.remove("show");}
  if(hamburger) hamburger.addEventListener("click",openSidebar);
  if(closeBtn) closeBtn.addEventListener("click",closeSidebar);

  if(overlay) overlay.addEventListener("click",closeSidebar);
});

// Profile dropdown
document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('profileToggle');
    const dropdown = document.getElementById('profileDropdown');
    const nameEl = document.getElementById('profileName');
    const data = JSON.parse(localStorage.getItem('customerData') || '{}');
    if (data.nome) nameEl.textContent = data.nome;
    if (toggle && dropdown) {
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', function() {
            dropdown.style.display = 'none';
        });
    }
});
