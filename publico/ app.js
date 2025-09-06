document.getElementById('btnSearch').addEventListener('click', async () => {
  const word = document.getElementById('search').value.trim();
  if (!word) return alert('Digite uma palavra!');

  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = 'Pesquisando...';

  try {
    const res = await fetch('/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word })
    });
    const data = await res.json();

    if (data.error) {
      resultDiv.innerHTML = data.error;
      return;
    }

    let html = `<h2>${word}</h2>`;
    html += `<p><strong>Tradução:</strong> ${data.translation}</p>`;
    if (data.examples) {
      html += '<ul>';
      data.examples.forEach(ex => html += `<li>${ex}</li>`);
      html += '</ul>';
    }
    if (data.audio) {
      html += `<audio controls src="${data.audio}"></audio>`;
    }

    resultDiv.innerHTML = html;
  } catch (err) {
    resultDiv.innerHTML = 'Erro ao pesquisar a palavra.';
  }
});
