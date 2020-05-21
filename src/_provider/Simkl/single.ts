import { SingleAbstract } from '../singleAbstract';
import * as helper from './helper';
import { errorCode } from '../definitions';

export class Single extends SingleAbstract {
  private animeInfo: any;

  private episodeUpdate = false;

  private statusUpdate = false;

  private ratingUpdate = false;

  private minWatchedEp = 1;

  private curWatchedEp = 0;

  shortName = 'Simkl';

  authenticationUrl =
    'https://simkl.com/oauth/authorize?response_type=code&client_id=39e8640b6f1a60aaf60f3f3313475e830517badab8048a4e52ff2d10deb2b9b0&redirect_uri=https://simkl.com/apps/chrome/mal-sync/connected/';

  protected rewatchingSupport = false;

  protected handleUrl(url) {
    if (url.match(/simkl\.com\/(anime|manga)\/\d*/i)) {
      this.type = utils.urlPart(url, 3) === 'anime' ? 'anime' : 'manga';
      this.ids.simkl = parseInt(utils.urlPart(url, 4));
      if (this.type === 'manga') throw 'Simkl has no manga support';
      return;
    }
    if (url.match(/myanimelist\.net\/(anime|manga)\/\d*/i)) {
      this.type = utils.urlPart(url, 3) === 'anime' ? 'anime' : 'manga';
      this.ids.mal = Number(utils.urlPart(url, 4));
      if (this.type === 'manga') throw 'Simkl has no manga support';
      return;
    }
    throw this.errorObj(errorCode.UrlNotSuported, 'Url not supported');
  }

  getCacheKey() {
    return helper.getCacheKey(this.ids.mal, this.ids.simkl);
  }

  _getStatus() {
    return parseInt(helper.translateList(this.animeInfo.status));
  }

  _setStatus(status) {
    if (status === 23) status = 1;
    status = helper.translateList(status, parseInt(status.toString()));
    if (status !== this.animeInfo.status) this.statusUpdate = true;
    this.animeInfo.status = status;
  }

  _getScore() {
    const score = this.animeInfo.user_rating;
    if (score === null) return 0;
    return score;
  }

  _setScore(score) {
    if (score === 0) score = null;
    if (score !== this.animeInfo.user_rating) this.ratingUpdate = true;
    this.animeInfo.user_rating = score;
  }

  _getEpisode() {
    return this.curWatchedEp;
  }

  _setEpisode(episode) {
    if (episode !== this.curWatchedEp) this.episodeUpdate = true;
    this.curWatchedEp = episode;
  }

  _getVolume() {
    return 0;
  }

  _setVolume(volume) {
    con.error('You cant set Volumes for animes');
  }

  _getStreamingUrl() {
    const tags = this.animeInfo.private_memo;
    return utils.getUrlFromTags(tags);
  }

  _setStreamingUrl(url) {
    let tags = this.animeInfo.private_memo;
    if (tags === null || tags === 'null') tags = '';

    tags = utils.setUrlInTags(url, tags);

    this.animeInfo.private_memo = tags;
  }

  _getTitle() {
    return this.animeInfo.show.title;
  }

  _getTotalEpisodes() {
    const eps = this.animeInfo.total_episodes_count;
    if (eps === null) return 0;
    return eps;
  }

  _getTotalVolumes() {
    return 0;
  }

  _getDisplayUrl() {
    return `https://simkl.com/${this.getType()}/${this.ids.simkl}`;
  }

  _getImage() {
    return Promise.resolve(
      `https://simkl.in/posters/${this.animeInfo.show.poster}_ca.jpg`,
    );
  }

  async _getRating() {
    try {
      const el = await this.call(
        'https://api.simkl.com/ratings',
        { simkl: this.ids.simkl },
        true,
      );
      return el.simkl.rating;
    } catch (e) {
      con.error(e);
      return 'N/A';
    }
  }

  async _update() {
    if (isNaN(this.ids.mal)) {
      var de = { simkl: this.ids.simkl };
    } else {
      // @ts-ignore
      var de = { mal: this.ids.mal };
    }

    this._authenticated = true;

    return this.getSingle(de)
      .catch(e => {
        if (e.code === errorCode.NotAutenticated) {
          this._authenticated = false;
          return '';
        }
        throw e;
      })
      .then(async res => {
        con.log(res);

        this.episodeUpdate = false;
        this.statusUpdate = false;
        this.ratingUpdate = false;

        this.animeInfo = res;

        this._onList = true;

        if (!this.animeInfo) {
          this._onList = false;
          if (de.simkl) {
            var el = await this.call(
              `https://api.simkl.com/anime/${de.simkl}`,
              { extended: 'full' },
              true,
            );
            if (!el)
              throw this.errorObj(errorCode.EntryNotFound, 'Anime not found');
          } else {
            var el = await this.call(
              'https://api.simkl.com/search/id',
              de,
              true,
            );
            if (!el)
              throw this.errorObj(errorCode.EntryNotFound, 'Anime not found');
            if (el[0].mal && el[0].mal.type && el[0].mal.type === 'Special')
              throw { code: 415, message: 'Is a special' };
            el = el[0];
          }

          this.animeInfo = {
            last_watched: '',
            last_watched_at: '',
            next_to_watch: '',
            not_aired_episodes_count: 0,
            private_memo: '',
            status: 'plantowatch',
            total_episodes_count: 0,
            user_rating: null,
            watched_episodes_count: 0,
            show: el,
          };
          con.log('Add anime', this.animeInfo);
        }

        if (isNaN(this.ids.simkl)) {
          this.ids.simkl = parseInt(this.animeInfo.show.ids.simkl);
        }

        if (
          isNaN(this.ids.mal) &&
          typeof this.animeInfo.show.ids.mal !== 'undefined'
        ) {
          this.ids.mal = this.animeInfo.show.ids.mal;
        }

        this.curWatchedEp = helper.getEpisode(this.animeInfo.last_watched);
        if (!this.curWatchedEp && this.animeInfo.next_to_watch) {
          const next = helper.getEpisode(this.animeInfo.next_to_watch);
          if (next) this.curWatchedEp = next - 1;
        }
        this.minWatchedEp = this.curWatchedEp + 1;

        if (!this._authenticated)
          throw this.errorObj(errorCode.NotAutenticated, 'Not Authenticated');
      });
  }

  async _sync() {
    con.log(
      '[SET] Object:',
      this.animeInfo,
      'status',
      this.statusUpdate,
      'episode',
      this.episodeUpdate,
      'rating',
      this.ratingUpdate,
      'minWatchedEp',
      this.minWatchedEp,
      'curWatchedEp',
      this.curWatchedEp,
    );
    // Status
    if (this.statusUpdate || !this.isOnList()) {
      var response = await this.call(
        'https://api.simkl.com/sync/add-to-list',
        JSON.stringify({
          shows: [
            {
              to: this.animeInfo.status,
              ids: {
                simkl: this.ids.simkl,
              },
            },
          ],
        }),
        false,
        'POST',
      );
      con.log('Status response', response);
    }

    // Episode and memo
    if (this.episodeUpdate || !this.isOnList()) {
      const curEp = this.curWatchedEp;
      const episodes: { number: number }[] = [];

      if (this.minWatchedEp <= curEp) {
        if (curEp) {
          for (var i = this.minWatchedEp; i <= curEp; i++) {
            episodes.push({
              number: i,
            });
          }

          var response = await this.call(
            'https://api.simkl.com/sync/history',
            JSON.stringify({
              shows: [
                {
                  ids: {
                    simkl: this.ids.simkl,
                  },
                  private_memo: this.animeInfo.private_memo,
                  seasons: [
                    {
                      number: 1,
                      episodes,
                    },
                  ],
                },
              ],
            }),
            false,
            'POST',
          );
          con.log('Episode response', response);
        }
      } else {
        for (var i = this.minWatchedEp - 1; i > curEp; i -= 1) {
          episodes.push({
            number: i,
          });
        }

        var response = await this.call(
          'https://api.simkl.com/sync/history/remove',
          JSON.stringify({
            shows: [
              {
                ids: {
                  simkl: this.ids.simkl,
                },
                seasons: [
                  {
                    number: 1,
                    episodes,
                  },
                ],
              },
            ],
          }),
          false,
          'POST',
        );
        con.log('Episode remove response', response);
      }

      this.minWatchedEp = curEp + 1;
    }

    // Rating
    if (this.ratingUpdate) {
      if (this.animeInfo.user_rating) {
        var response = await this.call(
          'https://api.simkl.com/sync/ratings',
          JSON.stringify({
            shows: [
              {
                rating: this.animeInfo.user_rating,
                ids: {
                  simkl: this.ids.simkl,
                },
              },
            ],
          }),
          false,
          'POST',
        );
        con.log('Rating response', response);
      } else {
        var response = await this.call(
          'https://api.simkl.com/sync/ratings/remove',
          JSON.stringify({
            shows: [
              {
                ids: {
                  simkl: this.ids.simkl,
                },
              },
            ],
          }),
          false,
          'POST',
        );
        con.log('Rating remove response', response);
      }
    }

    this.episodeUpdate = false;
    this.statusUpdate = false;
    this.ratingUpdate = false;
  }

  protected syncList = helper.syncList;

  protected getSingle = helper.getSingle;

  protected call = helper.call;

  errorHandling(res, code) {
    if ((code > 499 && code < 600) || code === 0) {
      throw this.errorObj(
        errorCode.ServerOffline,
        `Server Offline status: ${code}`,
      );
    }

    if (res && typeof res.error !== 'undefined') {
      con.error('[SINGLE]', 'Error', res.error);
      const { error } = res;
      if (error.code) {
        switch (error.code) {
          default:
            throw this.errorObj(error.code, error.error);
        }
      } else {
        switch (error) {
          case 'user_token_failed':
            throw this.errorObj(errorCode.NotAutenticated, 'user_token_failed');
            break;
          default:
            throw error;
        }
      }
    }
  }

  jsonParse(response) {
    if (response.responseText === '') {
      throw {
        code: 444,
        message: 'No Response',
      };
    }

    try {
      return JSON.parse(response.responseText);
    } catch (e) {
      throw {
        code: 406,
        message: 'Not Acceptable',
        error: e,
      };
    }
  }
}
