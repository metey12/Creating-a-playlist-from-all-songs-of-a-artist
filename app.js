const accessToken = localStorage.getItem('spotifyAccessToken');
const artistInput = document.getElementById('artistInput');
const artistSuggestions = document.getElementById('artistSuggestions');
const createPlaylistBtn = document.getElementById('createPlaylistBtn');
const playlistNameInput = document.getElementById('playlistName');
const playlistDescriptionInput = document.getElementById('playlistDescription');

async function loadArtists(query) {
  const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=5`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Spotify API hatası: ${response.status} - ${errorText}`);
    alert(`Spotify API hatası: ${response.status} - ${errorText}`);
    return;
  }

  const data = await response.json();
  const artists = data.artists.items;

  if (artists.length === 0) {
    artistSuggestions.innerHTML = '<li>Hiçbir sanatçı bulunamadı.</li>';
    return;
  }

  artistSuggestions.innerHTML = '';
  artists.forEach(artist => {
    const li = document.createElement('li');
    li.textContent = artist.name;
    li.dataset.artistId = artist.id;
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => {
      artistInput.value = artist.name;
      artistInput.dataset.selectedArtistId = artist.id;
      artistSuggestions.innerHTML = '';
    });
    artistSuggestions.appendChild(li);
  });
}


artistInput.addEventListener('input', async (e) => {
  const query = e.target.value.trim();
  if (query.length < 2) {
    artistSuggestions.innerHTML = '';
    return;
  }

  await loadArtists(query);
});


createPlaylistBtn.addEventListener('click', async () => {
  const selectedArtistId = artistInput.dataset.selectedArtistId;
  const playlistName = playlistNameInput.value.trim();
  const playlistDescription = playlistDescriptionInput.value.trim();

  if (!selectedArtistId) {
    alert('Lütfen bir sanatçı seçin.');
    return;
  }

  if (!playlistName) {
    alert('Lütfen playlist adı girin.');
    return;
  }

  try {
    const trackUris = await getArtistTracks(selectedArtistId);
    if (trackUris.length === 0) {
      alert('Sanatçının şarkıları alınamadı. Lütfen farklı bir sanatçı seçin.');
      return;
    }
    const playlist = await createPlaylist(trackUris, playlistName, playlistDescription);
    alert('Playlist oluşturuldu: ' + playlist.name);
  } catch (error) {
    console.error('Playlist oluşturulamadı:', error.message);
    alert('Playlist oluşturulamadı: ' + error.message);
  }
});

async function getArtistTracks(artistId) {
  let allTracks = [];
  let offset = 0;
  let hasMoreTracks = true;

  while (hasMoreTracks) {
    const albumsResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?limit=50&offset=${offset}&include_groups=album,single`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!albumsResponse.ok) {
      const errorText = await albumsResponse.text();
      console.error(`Spotify API hatası: ${albumsResponse.status} - ${errorText}`);
      throw new Error(`Spotify API hatası: ${albumsResponse.status}`);
    }

    const albumsData = await albumsResponse.json();
    const albums = albumsData.items;

    if (albums.length === 0) {
      hasMoreTracks = false;
      break;
    }

    for (let album of albums) {
      const tracksResponse = await fetch(album.href + '/tracks', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!tracksResponse.ok) {
        const errorText = await tracksResponse.text();
        console.error(`Spotify API hatası: ${tracksResponse.status} - ${errorText}`);
        throw new Error(`Spotify API hatası: ${tracksResponse.status}`);
      }

      const tracksData = await tracksResponse.json();

      if (tracksData.items.length === 0) {
        console.log(`Albümde şarkı yok: ${album.name}`);
      } else {
        console.log(`Albümde ${tracksData.items.length} şarkı bulundu: ${album.name}`);
      }

      allTracks = allTracks.concat(tracksData.items.map(track => track.uri));
    }

    if (albumsData.next) {
      offset += 50;
    } else {
      hasMoreTracks = false;
    }
  }

  console.log('Toplam şarkı sayısı:', allTracks.length);
  return allTracks;
}

async function createPlaylist(trackUris, playlistName, playlistDescription) {
  if (!trackUris || trackUris.length === 0) {
    throw new Error('Playlist için şarkı seçilmedi.');
  }

  const userResponse = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  const userData = await userResponse.json();

  const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${userData.id}/playlists`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: playlistName,
      description: playlistDescription,
      public: true
    })
  });

  if (!playlistResponse.ok) {
    const errorText = await playlistResponse.text();
    throw new Error(`Playlist oluşturulamadı: ${errorText}`);
  }

  const playlistData = await playlistResponse.json();
  const playlistId = playlistData.id;


  const chunkSize = 100;
  for (let i = 0; i < trackUris.length; i += chunkSize) {
    const trackChunk = trackUris.slice(i, i + chunkSize);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const tracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: trackChunk
        })
      });

      if (!tracksResponse.ok) {
        const errorText = await tracksResponse.text();
        throw new Error(`Şarkılar playlist'e eklenemedi: ${errorText}`);
      }
    } catch (error) {
      console.error(`Playlist'e şarkılar eklenemedi: ${error.message}`);
      throw new Error(`Şarkılar playlist'e eklenemedi: ${error.message}`);
    }
  }

  return playlistData;
}
