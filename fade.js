// fade.js
document.addEventListener('DOMContentLoaded', function() {
  const contentContainer = document.getElementById('content-container');

  // Store initial content and form content
  const initialContentHTML = `
    <p id="statement">Optimizing human capability in the AI era with precision neuroscience and applied neurotechnology.</p>
    <a href="#" id="cta-link">Get in Touch</a>
  `;

  const formContentHTML = `
    <form id="contact-form">
      <h2>Contact Us</h2>
      <label for="name">Name:</label>
      <input type="text" id="name" name="name" required>

      <label for="email">Email:</label>
      <input type="email" id="email" name="email" required>

      <label for="email">Interest:</label>
      <select id="select_interest" name="select_interest" required>
        <option value="" disabled selected>Select an option</option>
        <option value="investor">Investor</option>
        <option value="consumer">Consumer</option>
        <option value="institution">Institution</option>
        <option value="industry">Industry</option>
        <option value="defense">Defense</option>
        <option value="media">Media</option>
      </select>

      <label for="message">Message:</label>
      <textarea id="message" name="message" required></textarea>

      <button type="submit">Submit</button>
    </form>
  `;

  // Initialize with initial content
  contentContainer.innerHTML = initialContentHTML;
  attachCTAEvent();

  function attachCTAEvent() {
    const ctaLink = document.getElementById('cta-link');
    ctaLink.addEventListener('click', function(event) {
      event.preventDefault();
      fadeOutContent(function() {
        contentContainer.innerHTML = formContentHTML;
        attachFormEvent();
        fadeInContent();
      });
    });
  }

  function attachFormEvent() {
    const contactForm = document.getElementById('contact-form');
    contactForm.addEventListener('submit', function(event) {
      event.preventDefault();
      fadeOutContent(function() {
        contentContainer.innerHTML = initialContentHTML;
        attachCTAEvent();
        fadeInContent();
        // Optionally, reset the form fields
        contactForm.reset();
      });
    });
  }

  function fadeOutContent(callback) {
    contentContainer.classList.add('fade-out');
    setTimeout(function() {
      if (callback) callback();
      contentContainer.classList.remove('fade-out');
    }, 500); // Wait for the fade-out transition (0.5s)
  }

  function fadeInContent() {
    contentContainer.classList.add('fade-in');
    setTimeout(function() {
      contentContainer.classList.remove('fade-in');
    }, 500); // Wait for the fade-in transition (0.5s)
  }
});

