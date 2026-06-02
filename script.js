const helloButton = document.getElementById('helloButton');
const colorButton = document.getElementById('colorButton');
const alertButton = document.getElementById('alertButton');
const outputText = document.getElementById('outputText');

helloButton.addEventListener('click', () => {
  outputText.textContent = 'Hello! Thanks for clicking the button.';
});

colorButton.addEventListener('click', () => {
  document.body.style.background =
    document.body.style.background === 'lightyellow'
      ? 'linear-gradient(135deg, #f2f4ff, #ffffff)'
      : 'lightyellow';
  outputText.textContent = 'Background color changed!';
});

alertButton.addEventListener('click', () => {
  alert('This is a sample alert from the website.');
  outputText.textContent = 'Alert shown successfully.';
});
