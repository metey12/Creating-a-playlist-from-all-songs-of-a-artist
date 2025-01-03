const CLIENT_ID = 'your_client_id'; //
const REDIRECT_URI = 'your_redirect_url'; // 
const AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${REDIRECT_URI}&scope=user-library-read playlist-modify-public`;

let accessToken2 = localStorage.getItem('spotifyAccessToken');

if (!accessToken2) {
  document.getElementById('loginBtn').addEventListener('click', () => {
    window.location.href = AUTH_URL;
  });
} else {
  initializeApp();
}

function getAccessTokenFromURL() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  if (token) {
    localStorage.setItem('spotifyAccessToken', token);
    window.location.href = REDIRECT_URI;
  }
}

async function initializeApp() {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken2}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify API hatası: ${response.status}`);
    }

    const userData = await response.json();

    const username = document.getElementById('username');
    username.textContent = userData.display_name || 'Kullanıcı';

    document.getElementById('user-info').style.display = 'block';

    loadArtists();

  } catch (error) {
    console.error('Kullanıcı bilgileri alınamadı:', error.message);
    alert('Kullanıcı bilgilerini alırken bir hata oluştu. Lütfen tekrar deneyin.');
  }
}

getAccessTokenFromURL();
