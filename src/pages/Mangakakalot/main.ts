import { pageInterface } from '../pageInterface';

export const Mangakakalot: pageInterface = {
  name: 'Mangakakalot',
  domain: 'https://mangakakalot.com',
  database: 'MangaNelo',
  type: 'manga',
  isSyncPage(url) {
    if (url.split('/')[3] === 'chapter') {
      return true;
    }
    return false;
  },
  sync: {
    getTitle(url) {
      return j
        .$('body > div.breadcrumb > p > span:nth-child(3) > a > span')
        .first()
        .text();
    },
    getIdentifier(url) {
      return utils.urlPart(url, 4);
    },
    getOverviewUrl(url) {
      return (
        j
          .$('body > div.breadcrumb > p > span:nth-child(3) > a')
          .first()
          .attr('href') || ''
      );
    },
    getEpisode(url) {
      return Number(url.split('/')[5].match(/\d+/gim));
    },
    nextEpUrl(url) {
      return j
        .$('div.btn-navigation-chap > a.back')
        .first()
        .attr('href');
    },
  },
  overview: {
    getTitle(url) {
      return j
        .$('div.breadcrumb.breadcrumbs > p > span:nth-child(3) > a > span')
        .first()
        .text();
    },
    getIdentifier(url) {
      return utils.urlPart(url, 4);
    },
    uiSelector(selector) {
      j.$(
        `<div id="malthing"> <p id="malp">${selector.html()}</p></div>`,
      ).insertBefore(j.$('#chapter').first());
    },

    list: {
      offsetHandler: false,
      elementsSelector() {
        return j.$("div.row:not('div.title-list-chapter')");
      },
      elementUrl(selector) {
        return (
          selector
            .find('span:nth-child(1) > a')
            .first()
            .attr('href') || ''
        );
      },
      elementEp(selector) {
        return selector
          .find('span:nth-child(1) > a')
          .first()
          .attr('href')
          .split('/')[5]
          .match(/\d+/gim);
      },
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
      if (
        page.url.split('/')[3] === 'chapter' ||
        page.url.split('/')[3] === 'manga'
      ) {
        page.handlePage();
      }
    });
  },
};
