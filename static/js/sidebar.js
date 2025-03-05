// sidebar.js – Handle sidebar open/close and toggle of options sections

export function initSidebar() {
    document.getElementById('burgerIcon').addEventListener('click', function() {
      document.getElementById('sidebar').classList.add('open');
      this.style.display = 'none';
    });
    
    document.getElementById('closeBtn').addEventListener('click', function() {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('burgerIcon').style.display = 'block';
    });
    
    // Toggle Route Options section
    document.getElementById("routeOptionsToggle").addEventListener("click", function () {
      let content = document.getElementById("routeOptionsContent");
      let arrow = document.getElementById("routeOptionsArrow");
      content.classList.toggle("hidden");
      arrow.classList.toggle("open");
    });
    
    // Toggle Additional Options section
    document.getElementById("additionalOptionsToggle").addEventListener("click", function () {
      let content = document.getElementById("additionalOptionsContent");
      let arrow = document.getElementById("additionalOptionsArrow");
      content.classList.toggle("hidden");
      arrow.classList.toggle("open");
    });
  }
  