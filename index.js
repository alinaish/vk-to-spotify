const fs = require('fs');
const htmlParser = require('node-html-parser');
const http = require('http');

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

// getVKPlaylistFromHtml();

/* Create an HTTP server to handle responses */
http
  .createServer(function(request, response) {
    const url = request.url;

    switch (url) {
      case '/about':
        const clientId = '2d53491834a9437eb3b5ccb7cdce4832';
        const scope = encodeURIComponent('playlist-modify-private');
        const redirectURI = encodeURIComponent('http://localhost:8888');
        const spotifyAuthUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${scope}&redirect_uri=${redirectURI}`;
        response.writeHead(301, {
          'Content-Type': 'text/plain',
          Location: spotifyAuthUrl,
        });
        break;
      default:
        response.writeHead(200);
        response.write('Hello World');
    }
    response.end();
  })
  .listen(8888);
