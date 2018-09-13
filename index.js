const fs = require('fs');
const htmlParser = require('node-html-parser');

const vkHtmlPath = process.argv[2];

if (!vkHtmlPath) {
  return;
}

function getVKPlaylistFromHtml() {
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

getVKPlaylistFromHtml();
