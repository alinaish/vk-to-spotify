const fs = require('fs');
const htmlParser = require('node-html-parser');
const axios = require('axios');
const express = require('express');
const qs = require('querystring');

function getVKPlaylistFromHtml() {
  const vkHtmlPath = process.argv[2];

  if (!vkHtmlPath) {
    return;
  }

  const htmlContent = fs.readFileSync(vkHtmlPath, { encoding: 'utf8' });
  const html = htmlParser.parse(htmlContent);
  const tracks = html.querySelectorAll('.audio_row__inner').map(audioRow => {
    return {
      artist: audioRow.querySelector('.artist_link').text,
      name: audioRow.querySelector('._audio_row__title_inner').text,
    };
  });

  return tracks;
}

const app = express();

app.listen(8888);

const secret = process.env.secret;
const clientId = process.env.clientId;
const scope = 'playlist-modify-private';
const redirectURI = 'http://localhost:8888/callback';

/**
 * Steps that are need to be made for adding songs to playlist
 * 1. Get a code after redirecting users to https://accounts.spotify.com/authorize
 * 2. Get access token
 * 3. Request user profile data to use user id after
 * 4. Create a playlist
 * ...
 */

app.get('/', (req, res) => {
  const encodedRedirectURI = encodeURIComponent(
    'http://localhost:8888/callback'
  );
  const encodedScope = encodeURIComponent('playlist-modify-private');
  const spotifyCodeURL = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodedScope}&redirect_uri=${encodedRedirectURI}`;
  res.redirect(spotifyCodeURL);
});

app.get('/callback', async (req, res) => {
  res.send('Hello world');
  // Rewrite to flat structure
  if (req.query.code) {
    const tokens = await fetchAccessToken(req.query.code);
    const token = tokens.access_token;
    if (token) {
      const profile = await fetchUserProfile(token);

      if (profile.id) {
        const playlist = await createPlaylist(profile.id, token);

        if (playlist) {
          const uris = await findTrackUris(token);
          await addTracksToPlaylist(token, playlist.id, uris);

          process.exit();
        }
      }
    }
  }
});

async function fetchAccessToken(code) {
  try {
    const authEncoded = Buffer.from(clientId + ':' + secret).toString('base64');
    // request access and refresh tokens
    const res = await axios.post(
      'https://accounts.spotify.com/api/token',
      qs.stringify({
        code: code,
        redirect_uri: redirectURI,
        grant_type: 'authorization_code',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic  ${authEncoded}`,
        },
      }
    );
    return res.data;
  } catch (e) {
    console.error(e);
  }
}

async function fetchUserProfile(token) {
  try {
    const res = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res.data;
  } catch (e) {
    console.error(e);
  }
}

async function createPlaylist(userId, token) {
  try {
    const res = await axios.post(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        name: 'from VK',
        public: false,
        description: 'created by nodejs script',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return res.data;
  } catch (e) {
    console.log(e);
  }
}

async function findTrackUris(token) {
  const parsedTracks = getVKPlaylistFromHtml();
  const uris = [];
  let foundCount = 0;
  let notFoundCount = 0;
  const notFoundTracks = [];

  console.log(`Tracks total: ${parsedTracks.length}`);

  try {
    for (let i = 0; i < parsedTracks.length; i++) {
      const parsedTrackInfo = parsedTracks[i];

      const artist = parsedTrackInfo.artist.replace(' ', '+');
      const encodedArtist = encodeURIComponent(artist);

      const name = parsedTrackInfo.name.replace(' ', '+');
      const encodedName = encodeURIComponent(name);
      const searchUrl = `https://api.spotify.com/v1/search?q=${encodedArtist}+${encodedName}&type=track`;

      const track = await axios.get(searchUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (track.data.tracks && track.data.tracks.total > 0) {
        foundCount++;
        uris.push(track.data.tracks.items[0].uri);
        console.log(
          `${i}. ${artist} - ${name} uri:${track.data.tracks.items[0].uri}`
        );
      } else {
        notFoundCount++;
        notFoundTracks.push[`${artist} - ${name}`];
        console.log(`${i}. ${artist} - ${name} uri: none`);
      }
    }

    console.log(`Found: ${foundCount}`);
    console.log(`Not found: ${notFoundCount}`, notFoundTracks);

    return uris;
  } catch (e) {
    console.log(e);
  }
}

async function addTracksToPlaylist(token, playlistId, uris) {
  try {
    while (uris.length > 0) {
      // 100 is a max limit of tracks that can be added at once
      const uriChunk = uris.splice(0, 100);
      console.log(uriChunk);
      const response = await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          uris: uriChunk,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(response.data);
    }
  } catch (e) {
    console.log(e.error);
  }
}
