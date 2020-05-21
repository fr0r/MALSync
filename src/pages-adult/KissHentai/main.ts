import { pageInterface } from '../../pages/pageInterface';

export const KissHentai: pageInterface = {
  name: 'KissHentai',
  domain: 'http://kisshentai.net',
  type: 'anime',
  isSyncPage(url) {
    if (url.split('/')[3] === 'Hentai' && j.$('div#videoKissHentai')[0]) {
      return true;
    }
    return false;
  },
  sync: {
    getTitle(url) {
      return j
        .$('#navsubbar a')
        .first()
        .text()
        .replace('Hentai', '')
        .replace('information', '')
        .trim();
    },
    getIdentifier(url) {
      return url.split('/')[4];
    },
    getOverviewUrl(url) {
      const anchorHref = j
        .$('#navsubbar a')
        .first()
        .attr('href');

      if (!anchorHref) return '';

      return KissHentai.domain + anchorHref;
    },
    getEpisode(url) {
      const urlParts = url.split('/');

      if (!urlParts || urlParts.length === 0) return NaN;

      const episodePart = urlParts[5];

      if (episodePart.length === 0) return NaN;

      const temp = episodePart.match(/Episode-\d+/gim);

      if (!temp || temp.length === 0) return NaN;

      return Number(temp[0].replace(/\D+/g, ''));
    },
  },
  overview: {
    getTitle() {
      return j
        .$('.bigChar')
        .first()
        .text();
    },
    getIdentifier(url) {
      return url.split('/')[4];
    },
    uiSelector(selector) {
      selector.insertAfter(j.$('.bigChar').first());
    },
  },
  init(page) {
    if (document.title === 'Just a moment...') {
      con.log('loading');
      page.cdn();
      return;
    }
    api.storage.addStyle(
      require('!to-string-loader!css-loader!less-loader!./style.less').toString(),
    );
    j.$(document).ready(function() {
      if (page.url.split('/')[3] === 'Hentai') {
        page.handlePage();
      }
    });
  },
};
