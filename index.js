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

const secret = '36e2af1f054449fc8fd82ba5a73ca233';
const clientId = '2d53491834a9437eb3b5ccb7cdce4832';
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
  if (req.query.code) {
    const tokens = await fetchAccessToken(req.query.code);
    const token = tokens.access_token;
    if (token) {
      const profile = await fetchUserProfile(token);

      if (profile.id) {
        const playlist = await createPlaylist(profile.id, token);
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
        name: 'test_playlist',
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

    console.log(res);
    return res.data;
  } catch (e) {
    console.log(e);
  }
}

// app.get('/callback', (req, res) => {
//   if (req.query.code) {
//     const tokenReqParams = {
//       url: 'https://accounts.spotify.com/api/token',
//       form: {
//         code: req.query.code,
//         redirect_uri: redirectURI,
//         grant_type: 'authorization_code',
//       },
//       headers: {
//         Authorization:
//           'Basic ' + new Buffer(clientId + ':' + secret).toString('base64'),
//       },
//       json: true,
//     };
//     request.post(tokenReqParams, (error, tokenRes, body) => {
//       if (tokenRes.body.access_token) {
//         const userPropfileReqOptions = {
//           url: 'https://api.spotify.com/v1/me',
//           headers: {
//             Authorization: `Bearer ${tokenRes.body.access_token}`,
//           },
//           json: true,
//         };
//         request.get(
//           userProfileReqOptions,
//           (error, userProfileReq, userProfileBody) => {
//             console.log(userProfileBody.id);
//             if (userProfileBody.id) {
//               const createPlaylistOptions = {
//                 url: `https://api.spotify.com/v1/users/${
//                   userProfileBody.id
//                 }/playlists`,
//                 headers: {
//                   Authorization: `Bearer ${tokenRes.body.access_token}`,
//                   'Content-Type': 'application/json',
//                 },
//                 body: {
//                   name: 'test_playlist',
//                   public: false,
//                   description: 'created by nodejs script',
//                 },
//                 json: true,
//               };
//               request.post(
//                 createPlaylistOptions,
//                 (error, createPlaylistRes, createPlaylistBody) => {
//                   const tracks = getVKPlaylistFromHtml();

//                   tracks.forEach(track => {
//                     const artist = track.artist.replace(' ', '+');
//                     const name = track.name.replace(' ', '+');
//                     const searchUrl = `https://api.spotify.com/v1/search?q=${artist}+${name}&type=track`;
//                     const searchReqOptions = {
//                       url: searchUrl,
//                       headers: {
//                         Authorization: `Bearer ${tokenRes.body.access_token}`,
//                       },
//                       json: true,
//                     };

//                     request.get(
//                       searchReqOptions,
//                       (error, searchReq, searchReqBody) => {
//                         console.log(track.artist, track.name, searchReqBody);
//                       }
//                     );
//                   });
//                 }
//               );
//             }
//           }
//         );
//       }
//     });
//   }
// });
