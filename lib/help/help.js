import page from 'page';
import o from 'component-dom';
import qs from 'qs';
import title from '../title/title.js';
import { dom } from '../render/render.js';
import FAQ from '../help-faq/view.js';
import PP from '../help-pp/view.js';
import TOS from '../help-tos/view.js';
import AboutUs from '../help-about-us/view.js';
import Glossary from '../help-glossary/view.js';
import Markdown from '../help-markdown/view.js';
import config from '../config/config.js';
import helpContainer from './help-container.jade';

page('/help/:page?', valid, parse, (ctx, next) => {
  if (!ctx.valid) return next();

  let current = ctx.params.page || 'markdown';
  let container = dom(helpContainer);
  let content = o('.help-content', container);

  // prepare wrapper and container
  let el = o('#content');
  el.empty();
  el.append(container);

  let faq = new FAQ;
  let tos = new TOS;
  let pp = new PP;
  let glossary = new Glossary(ctx.query.word);
  let aboutUs = new AboutUs;
  let markdown = new Markdown;

  // set active section on sidebar
  if (o('.active', container)) {
    o('.active', container).removeClass('active');
  }

  let menuItem = o('a[href*="/help/' + current + '"]', container);
  menuItem.parent().addClass('active');

  // Set page's title
  title(menuItem.text());

  // render all help pages
  if(config.frequentlyAskedQuestions) faq.appendTo(content);
  if(config.termsOfService) tos.appendTo(content);
  if(config.privacyPolicy) pp.appendTo(content);
  if(config.glossary) glossary.appendTo(content);
  if(config.aboutUs) aboutUs.appendTo(content);
  markdown.appendTo(content);

  // Display current help page
  o('#' + current + '-wrapper', container).removeClass('hide');

  if (current == 'glossary') glossary.scroll();
});

function valid(ctx, next) {
  var p = ctx.params.page || "markdown";
  var valid = ['markdown'];
  if (config.frequentlyAskedQuestions) valid.push('faq');
  if (config.termsOfService) valid.push('terms-of-service');
  if (config.privacyPolicy) valid.push('privacy-policy');
  if (config.glossary) valid.push('glossary');
  if (config.aboutUs) valid.push('about-us');
  return ctx.valid = ~valid.indexOf(p), next();
}

function parse(ctx, next) {
  ctx.query = qs.parse(ctx.querystring);
  next();
}
