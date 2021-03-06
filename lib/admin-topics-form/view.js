/**
 * Module dependencies.
 */

import linkTemplate from './link.jade';
import closest from 'component-closest';
import confirm from 'democracyos-confirmation';
import Datepicker from 'democracyos-datepicker';
import FormView from '../form-view/form-view.js';
import debug from 'debug';
import o from 'component-dom';
import page from 'page';
import { dom as render } from '../render/render.js';
import request from '../request/request.js';
import t from 't-component';
import template from './template.jade';
import moment from 'moment';
import Richtext from '../richtext/richtext.js';
import Toggle from 'democracyos-toggle';
import * as serializer from '../proposal/body-serializer';
import topicStore from '../topic-store/topic-store';
import config from '../config/config';

const log = debug('democracyos:admin-topics-form');

/**
 * Creates a password edit view
 */
let created = false;

export default class TopicForm extends FormView {

  constructor(topic, forum, forums, tags) {
    super();
    this.setLocals(topic, forum, forums, tags);
    super(template, this.locals);

    if (0 === tags.length) return;

    this.renderDateTimePickers();
    if (created) {
      this.messages([t('admin-topics-form.message.onsuccess')]);
      created = false;
    }

    this.pubButton = this.find('a.make-public');
    this.privButton = this.find('a.make-private');

    var body = this.find('textarea[name=body]');
    new Richtext(body);
    this.renderToggles();
  }

  /**
   * Set locals for template
   */

  setLocals(topic, forum, forums, tags) {
    if (topic) {
      this.action = '/api/topic/' + topic.id;
      this.title = 'admin-topics-form.title.edit';
      topic.body = serializer.toHTML(topic.clauses);
    } else {
      this.action = '/api/topic/create';
      this.title = 'admin-topics-form.title.create';
    }

    this.topic = topic;
    this.tags = tags;
    this.forum = forum;
    this.forums = forums;
    //this.forumAdminUrl = '/admin:forum'.replace(':forum', forum ? `/${forum.name}` : '');
    this.forumAdminUrl = '/admin';

    this.locals = {
      form: { title: this.title, action: this.action },
      topic: this.topic || { clauses: [] },
      forums: this.forums,
      tags: this.tags,
      moment: moment,
      forum
    };
  }

  /**
   * Turn on event bindings
   */

  switchOn() {
    this.bind('click', 'a.add-link', this.bound('onaddlinkclick'));
    this.bind('click', 'a.remove-link', this.bound('onremovelinkclick'));
    this.bind('click', 'a.save', this.bound('onsaveclick'));
    this.bind('click', 'a.make-public', this.bound('onmakepublicclick'));
    this.bind('click', 'a.make-private', this.bound('onmakeprivateclick'));
    this.bind('click', 'a.delete-topic', this.bound('ondeletetopicclick'));
    this.bind('click', '.clear-closingAt', this.bound('onclearclosingat'));
    this.on('success', this.onsuccess);
  }

  /**
   * Handle `error` event with
   * logging and display
   *
   * @param {String} error
   * @api private
   */

  onsuccess(res) {
    log('Topic successfully saved');
    if (this.topic) {
      topicStore.unset(this.topic.id).parse(res.body).then(topic => {
        topicStore.set(topic.id, topic);
      });
    }

    created = true;
    var content = o('#content')[0];
    content.scrollTop = 0;
    // Forcefully re-render the form
    page(this.forumAdminUrl + '/topics/' + res.body.id);
  }

  /**
   * Renders datepicker and timepicker
   * elements inside view's `el`
   *
   * @return {TopicForm|Element}
   * @api public
   */

  renderDateTimePickers() {
    this.closingAt = this.find('[name=closingAt]', this.el);
    this.closingAtTime = this.find('[name=closingAtTime]');
    this.dp = Datepicker(this.closingAt[0]);
    return this;
  };

  onaddlinkclick(ev) {
    ev.preventDefault();

    var id = this.topic ? this.topic.id : null;
    if (null != id) return this.addLink();

    // if no topic, reveal message forbidden
    o('.add-link-forbidden', this.el).removeClass('hide');
  }

  addLink() {
    var links = o('.topic-links', this.el);

    request
    .post(config.subPath + this.action + '/link')
    .end(function (err, res) {
      if (err || !res.ok) return log('Found error %o', err || res.error);
      var link = render(linkTemplate, {
        link: res.body
      });
      links.append(o(link));
    });
  }

  onremovelinkclick(ev) {
    ev.preventDefault();

    var link = closest(ev.target, '[data-link]', true);
    var id = link ? link.getAttribute('data-link') : null;
    if (null == id) return false;

    confirm(t('admin-topics-form.link.confirmation.title'), t('admin-topics-form.delete-topic.confirmation.body'))
    .cancel(t('admin-topics-form.clause.confirmation.cancel'))
    .ok(t('admin-topics-form.clause.confirmation.ok'))
    .modal()
    .closable()
    .effect('slide')
    .show(onconfirm.bind(this));

    function onconfirm(ok) {
      if (ok) return this.removeLink(id);
    }
  }

  onsaveclick(ev) {
    ev.preventDefault();
    this.find('form input[type=submit]')[0].click();
  }

  removeLink(id) {
    var link = o('[data-link="' + id + '"]', this.el);

    request
    .del(config.subPath + this.action + '/link')
    .send({ link: id })
    .end(function (err, res) {
      if (err || !res.ok) return log('Found error %o', err || res.error);
      link[0].remove();
    });
  }

  postserialize(data) {
    data = data || {};

    var links = {};
    var linksregexp = /^links\[([a-z0-9]*)\]\[([^\]]*)\]/;

    for (var key in data) {
      var isLink = linksregexp.test(key)
        && data.hasOwnProperty(key);

      if (isLink) {
        var parsed = linksregexp.exec(key);
        var id = parsed[1];
        var prop = parsed[2];
        var value = data[key];
        links[id] = links[id] || {};
        links[id][prop] = value;
        delete data[key];
      }
    }

    var linksids = Object.keys(links);
    var linksret = [];

    linksids.forEach(function(id) {
      links[id].id = id;
      linksret.push(links[id]);
    });

    data.links = linksret;

    if (data.closingAt && data.closingAtTime) {
      var d = data.closingAt + ' ' + data.closingAtTime;
      data.closingAt = new Date(d);
    }

    data.clauses = serializer.toArray(data.body);
    delete data.body;
    data.votable = data.votable || false;
    data.author = data.topicAuthor;

    return data;
  }

  onmakepublicclick(ev) {
    ev.preventDefault();
    var view = this;

    this.pubButton.addClass('disabled');

    topicStore
      .publish(this.topic.id)
      .then(() => {
        view.pubButton.removeClass('disabled').addClass('hide');
        view.privButton.removeClass('hide');
      })
      .catch(err => {
        view.pubButton.removeClass('disabled');
        log('Found error %o', err);
      });
  }

  onmakeprivateclick(ev) {
    ev.preventDefault();
    var view = this;

    this.privButton.addClass('disabled');

    topicStore
      .unpublish(this.topic.id)
      .then(() => {
        view.privButton.removeClass('disabled');
        view.privButton.addClass('hide');
        view.pubButton.removeClass('hide');
      })
      .catch(err => {
        view.pubButton.removeClass('disabled');
        log('Found error %o', err);
      });
  }

  ondeletetopicclick(ev) {
    ev.preventDefault();

    const _t = s => t(`admin-topics-form.delete-topic.confirmation.${s}`);

    const onconfirmdelete = (ok) => {
      if (!ok) return;

      topicStore.destroy(this.topic.id)
        .then(() => { page(this.forumAdminUrl); })
        .catch(err => { log('Found error %o', err); });
    };

    confirm(_t('title'), _t('body'))
      .cancel(_t('cancel'))
      .ok(_t('ok'))
      .modal()
      .closable()
      .effect('slide')
      .show(onconfirmdelete);
  }

  onclearclosingat(ev) {
    ev.preventDefault();
    this.closingAt.value('');
    if (this.dp && this.dp.popover) {
      this.dp.popover.hide();
      this.dp = Datepicker(this.closingAt[0]);
    }
  }

  renderToggles() {
    var toggle = new Toggle();
    toggle.label(t('admin-topics-form.label.votable.yes'), t('admin-topics-form.label.votable.no'));
    toggle.name('votable');
    if( this.topic ){
      toggle.value(!!this.topic.votable)
    } else {
      toggle.value(true);
    }
    this.find('.votable-toggle').append(toggle.el);
  }

}

/**
 * Expose TopicForm
 */

module.exports = TopicForm;
