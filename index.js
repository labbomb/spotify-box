require('dotenv').config()

const { Octokit } = require('@octokit/rest')
const { getTopTracks } = require('./spotify')

const { GH_TOKEN: github_token, GIST_ID: gist_id } = process.env

const octo = new Octokit({
  auth: `token ${github_token}`,
})

async function main() {
  const json = await getTopTracks()
  await updateTopTracks(json)
}

function trimRightStr(str, len) {
  // Ellipsis takes 3 positions, so the index of substring is 0 to total length - 3.
  return str.length > len ? str.substring(0, len - 3) + "..." : str;
}

async function updateTopTracks(json) {
  let gist
  try {
    gist = await octo.gists.get({
      gist_id,
    })
  } catch (error) {
    console.error(
      `spotify-box ran into an issue for getting your gist ${gist_id}:\n${error}`
    )
    return
  }

  const tracks = json.items.map(item => ({
    name: item.name,
    artist: item.artists.map(artist => artist.name.trim()).join(' & '),
  }))
  if (!tracks.length) return

  const lines = []
  for (let index = 0; index < Math.min(tracks.length, 10); index++) {
    let { name, artist } = tracks[index]

    const line = [
      trimRightStr(name, 10).padEnd(10),
      ' '.padEnd(14),
      generateBarChart(100, 15),
      trimRightStr(artist, 10).padStart(5)
    ]
    lines.push(line.join(''))
  }
  console.log('lines', lines)
  try {
    const filename = Object.keys(gist.data.files)[0]
    await octo.gists.update({
      gist_id,
      files: {
        [filename]: {
          filename: 'My Spotify Top Tracks',
          content: lines.join('\n'),
        },
      },
    })
  } catch (error) {
    console.error(
      `spotify-box ran into an issue for updating your gist:\n${error}`
    )
  }
}

function generateBarChart(percent, size) {
  const syms = "         ";

  const frac = Math.floor((size * 8 * percent) / 100);
  const barsFull = Math.floor(frac / 8);
  if (barsFull >= size) {
    return syms.substring(8, 9).repeat(size);
  }
  const semi = frac % 8;

  return [syms.substring(8, 9).repeat(barsFull), syms.substring(semi, semi + 1)]
    .join("")
    .padEnd(size, syms.substring(0, 1));
}

;(async () => {
  await main()
})()
