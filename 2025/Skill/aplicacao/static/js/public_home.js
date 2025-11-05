// Smooth Scroll
document.querySelectorAll('.smooth-scroll').forEach(link => {
  link.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
  });
});

// Back to Top Button
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
      backToTop.classList.add('show');
  } else {
      backToTop.classList.remove('show');
  }
});

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Visitor Counter Animation
function animateCounter() {
  const counter = document.getElementById('visitorCount');
  const target = Math.floor(Math.random() * 50) + 20;
  let current = 0;
  const increment = target / 50;
  
  const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
          counter.textContent = target;
          clearInterval(timer);
      } else {
          counter.textContent = Math.floor(current);
      }
  }, 30);
}

// Fade-in Observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
      if (entry.isIntersecting) {
          entry.target.classList.add('visible');
      }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Card Hover Effects
document.querySelectorAll('.info-card').forEach(card => {
  card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-12px) scale(1.02)';
  });
  card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
  });
});

// Initialize
window.addEventListener('load', () => {
  animateCounter();
});

// Navbar scroll effect
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
  const currentScroll = window.scrollY;
  
  if (currentScroll > 100) {
      navbar.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
  } else {
      navbar.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08)';
  }
  
  lastScroll = currentScroll;
});
