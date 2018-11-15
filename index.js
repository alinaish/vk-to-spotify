const fs = require('fs');
const htmlParser = require('node-html-parser');
const request = require('request');
const express = require('express');

function getVKPlaylistFromHtml() {
  const vkHtmlPath = process.argv[2];

  if (!vkHtmlPath) {
    return;
  }

  fs.readFile(vkHtmlPath, 'utf8', (err, htmlContent) => {
    if (err) {
      throw err;
    }

    const html = htmlParser.parse(htmlContent);
    const vkPlaylist = html
      .querySelectorAll('.audio_row__inner')
      .map(audioRow => {
        return {
          artist: audioRow.querySelector('.artist_link').text,
          track: audioRow.querySelector('._audio_row__title_inner').text,
        };
      });
    console.log(vkPlaylist);
  });
}

const app = express();

app.listen(8888);

const secret = 'cbe1a0c113eb4cd58d11a483db488595';
const clientId = '2d53491834a9437eb3b5ccb7cdce4832';
const scope = 'playlist-modify-private';
const redirectURI = 'http://localhost:8888/callback';

app.get('/', (req, res) => {
  const encodedRedirectURI = encodeURIComponent(
    'http://localhost:8888/callback'
  );
  const encodedScope = encodeURIComponent('playlist-modify-private');
  const spotifyCodeURL = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodedScope}&redirect_uri=${encodedRedirectURI}`;
  res.redirect(spotifyCodeURL);
});

app.get('/callback', (req, res) => {
  if (req.query.code) {
    const tokenReqParams = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: req.query.code,
        redirect_uri: redirectURI,
        grant_type: 'authorization_code',
      },
      headers: {
        Authorization:
          'Basic ' + new Buffer(clientId + ':' + secret).toString('base64'),
      },
      json: true,
    };
    request.post(tokenReqParams, (error, tokenRes, body) => {
      if (tokenRes.body.access_token) {
        const userPropfileReqOptions = {
          url: 'https://api.spotify.com/v1/me',
          headers: {
            Authorization: `Bearer ${tokenRes.body.access_token}`,
          },
          json: true,
        };
        request.get(
          userPropfileReqOptions,
          (error, userProfileReq, userProfileBody) => {
            console.log(userProfileBody.id);
            if (userProfileBody.id) {
              const createPlaylistOptions = {
                url: `https://api.spotify.com/v1/users/${
                  userProfileBody.id
                }/playlists`,
                headers: {
                  Authorization: `Bearer ${tokenRes.body.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: {
                  name: 'test_playlist',
                  public: false,
                  description: 'created by nodejs script',
                },
                json: true,
              };
              request.post(
                createPlaylistOptions,
                (error, createPlaylistRes, createPlaylistBody) => {
                  console.log(createPlaylistBody);
                }
              );
            }
          }
        );
      }
    });
  }
});
