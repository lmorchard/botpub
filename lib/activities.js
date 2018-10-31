const ID_PUBLIC = "https://www.w3.org/ns/activitystreams#Public";

exports.createNote = ({
  bot,
  objectUuid,
  siteURL,
  actorURL,
  config,
  actor,
  actorDeref,
  content,
  inReplyTo,
  published,
}) => {
  const {
    profile: { name },
  } = bot;
  const { followers, url, preferredUsername } = actorDeref;

  const object = {
    type: "Note",
    id: `${siteURL}/${name}/objects/Note/${objectUuid}.json`,
    url: `${siteURL}/${name}/objects/Note/${objectUuid}.html`,
    published,
    attributedTo: actorURL,
    inReplyTo,
    to: [ID_PUBLIC],
    cc: [actor, followers],
    tag: [{ type: "Mention", href: actor }],
    content: `<p><span class="h-card"><a href="${url}" class="u-url mention">@<span>${preferredUsername}</span></a> </span>${content}</p>`,
  };

  const activity = {
    id: `${siteURL}/${name}/objects/Create/${objectUuid}.json`,
    url: `${siteURL}/${name}/objects/Create/${objectUuid}.html`,
    type: "Create",
    actor: actorURL,
    published,
    to: object.to,
    cc: object.cc,
    object,
  };

  return activity;
};
