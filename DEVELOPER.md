# Helpful information for Twinkle devs

## Reviewing and merging pull requests (WIP)

Collaborators are encouraged to thoroughly review and [test](./CONTRIBUTING.md#testing-your-code) each pull request, including their own.  Unless urgent or obvious, it can be helpful to leave PRs open for folks to opine.

Things to watch out for:

- Items and processes laid out in [CONTRIBUTING.md](./CONTRIBUTING.md) are followed.
- Twinkle is meant to run on the latest weekly version of MediaWiki as rolled out every Thursday on the English Wikipedia.  Backwards compatibility is not guaranteed.
- The goal is for Twinkle and Morebits to support the same [browsers that MediaWiki supports](https://www.mediawiki.org/wiki/Browser_compatibility).  In particular, collaborators should avoid [unsupported additions](https://kangax.github.io/compat-table/es6/) from ES6 (aka ES2015); `.includes` and `.find` are among the most likely to show up, although the jQuery `$.find()` is fine. Our ESLint configuration includes a [plugin](https://github.com/nkt/eslint-plugin-es5) that should catch most cases.
- Certain positional jQuery selectors like `:first`, `:last`, and `:eq` were [deprecated in jQuery version 3.4.0](https://blog.jquery.com/2019/04/10/jquery-3-4-0-released/) and should probably not be reintroduced.  Instead, use methods like `.first()`, `.last()`, or `.eq()`.

## Updating scripts on Wikipedia

There are two ways to upload Twinkle scripts to Wikipedia or another destination. You can do it with a [Perl script](#synchronization-using-syncpl) (recommended) or [manually](#manual-synchronization).

After the files are synced, ensure that [MediaWiki:Gadgets-definition][] contains the gadget definition found in [gadget.txt](./gadget.txt) (`sync.pl` will report its status). In addition to the `Twinkle` definition, the gadget installs the `morebits` library as a hidden gadget, making it efficiently available for other tools to use. `Twinkle-pagestyles` is a hidden [peer gadget](https://www.mediawiki.org/wiki/ResourceLoader/Migration_guide_(users)#Gadget_peers) of Twinkle. Before Twinkle has loaded, it adds space where the TW menu would go in the Vector skin, so that the top bar does not "jump".

[select2][] is also uploaded as a hidden gadget for better menus and to take advantage of the Resource Loader over the [Toolforge CDN](https://tools.wmflabs.org/cdnjs/); it is done so under the [MIT license](https://github.com/select2/select2/blob/develop/LICENSE.md).  Loading via the ResourceLoader causes it to register as a nodejs/commonjs environment with `module.exports`, so a slight tweak has been made, eliminating that check.  Ideally, this will be handled differently (see [external libraries](https://www.mediawiki.org/wiki/ResourceLoader/Migration_guide_for_extension_developers#Special_case_of_external_libraries) and [T108655](https://phabricator.wikimedia.org/T108655).  As such, be careful when updating select2 from upstream.

### Manual synchronization

Each Twinkle module and dependency lives on the wiki as a separate file. The list of modules and what pages they should be on are as follows:

- `twinkle.js` &rarr; [MediaWiki:Gadget-Twinkle.js][]
- `twinkle.css` &rarr; [MediaWiki:Gadget-Twinkle.css][]
- `twinkle-pagestyles.css` &rarr; [MediaWiki:Gadget-Twinkle-pagestyles.css][]
- `morebits.js` &rarr; [MediaWiki:Gadget-morebits.js][]
- `morebits.css` &rarr; [MediaWiki:Gadget-morebits.css][]
- `select2.min.js` &rarr; [MediaWiki:Gadget-select2.min.js][]
- `select2.min.css` &rarr; [MediaWiki:Gadget-select2.min.css][]
- `modules/twinkleprod.js` &rarr; [MediaWiki:Gadget-twinkleprod.js][]
- `modules/twinkleimage.js` &rarr; [MediaWiki:Gadget-twinkleimage.js][]
- `modules/twinklebatchundelete.js` &rarr; [MediaWiki:Gadget-twinklebatchundelete.js][]
- `modules/twinklewarn.js` &rarr; [MediaWiki:Gadget-twinklewarn.js][]
- `modules/twinklespeedy.js` &rarr; [MediaWiki:Gadget-twinklespeedy.js][]
- `modules/friendlyshared.js` &rarr; [MediaWiki:Gadget-friendlyshared.js][]
- `modules/twinklediff.js` &rarr; [MediaWiki:Gadget-twinklediff.js][]
- `modules/twinkleunlink.js` &rarr; [MediaWiki:Gadget-twinkleunlink.js][]
- `modules/friendlytag.js` &rarr; [MediaWiki:Gadget-friendlytag.js][]
- `modules/twinkledeprod.js` &rarr; [MediaWiki:Gadget-twinkledeprod.js][]
- `modules/friendlywelcome.js` &rarr; [MediaWiki:Gadget-friendlywelcome.js][]
- `modules/twinklexfd.js` &rarr; [MediaWiki:Gadget-twinklexfd.js][]
- `modules/twinklebatchdelete.js` &rarr; [MediaWiki:Gadget-twinklebatchdelete.js][]
- `modules/twinklebatchprotect.js` &rarr; [MediaWiki:Gadget-twinklebatchprotect.js][]
- `modules/twinkleconfig.js` &rarr; [MediaWiki:Gadget-twinkleconfig.js][]
- `modules/twinklefluff.js` &rarr; [MediaWiki:Gadget-twinklefluff.js][]
- `modules/twinkleprotect.js` &rarr; [MediaWiki:Gadget-twinkleprotect.js][]
- `modules/twinklearv.js` &rarr; [MediaWiki:Gadget-twinklearv.js][]
- `modules/friendlytalkback.js` &rarr; [MediaWiki:Gadget-friendlytalkback.js][]
- `modules/twinkleblock.js` &rarr; [MediaWiki:Gadget-twinkleblock.js][]

[MediaWiki:Gadgets-definition]: https://enwp.org//MediaWiki:Gadgets-definition
[MediaWiki:Gadget-Twinkle.js]: https://enwp.org//MediaWiki:Gadget-Twinkle.js
[MediaWiki:Gadget-Twinkle.css]: https://enwp.org//MediaWiki:Gadget-Twinkle.css
[MediaWiki:Gadget-Twinkle-pagestyles.css]: https://enwp.org//MediaWiki:Gadget-Twinkle-pagestyles.css
[MediaWiki:Gadget-morebits.js]: https://enwp.org//MediaWiki:Gadget-morebits.js
[MediaWiki:Gadget-morebits.css]: https://enwp.org//MediaWiki:Gadget-morebits.css
[MediaWiki:Gadget-select2.min.js]: https://enwp.org//MediaWiki:Gadget-select2.min.js
[MediaWiki:Gadget-select2.min.css]: https://enwp.org//MediaWiki:Gadget-select2.min.css
[MediaWiki:Gadget-twinkleprod.js]: https://enwp.org//MediaWiki:Gadget-twinkleprod.js
[MediaWiki:Gadget-twinkleimage.js]: https://enwp.org//MediaWiki:Gadget-twinkleimage.js
[MediaWiki:Gadget-twinklebatchundelete.js]: https://enwp.org//MediaWiki:Gadget-twinklebatchundelete.js
[MediaWiki:Gadget-twinklewarn.js]: https://enwp.org//MediaWiki:Gadget-twinklewarn.js
[MediaWiki:Gadget-twinklespeedy.js]: https://enwp.org//MediaWiki:Gadget-twinklespeedy.js
[MediaWiki:Gadget-friendlyshared.js]: https://enwp.org//MediaWiki:Gadget-friendlyshared.js
[MediaWiki:Gadget-twinklediff.js]: https://enwp.org//MediaWiki:Gadget-twinklediff.js
[MediaWiki:Gadget-twinkleunlink.js]: https://enwp.org//MediaWiki:Gadget-twinkleunlink.js
[MediaWiki:Gadget-friendlytag.js]: https://enwp.org//MediaWiki:Gadget-friendlytag.js
[MediaWiki:Gadget-twinkledeprod.js]: https://enwp.org//MediaWiki:Gadget-twinkledeprod.js
[MediaWiki:Gadget-friendlywelcome.js]: https://enwp.org//MediaWiki:Gadget-friendlywelcome.js
[MediaWiki:Gadget-twinklexfd.js]: https://enwp.org//MediaWiki:Gadget-twinklexfd.js
[MediaWiki:Gadget-twinklebatchdelete.js]: https://enwp.org//MediaWiki:Gadget-twinklebatchdelete.js
[MediaWiki:Gadget-twinklebatchprotect.js]: https://enwp.org//MediaWiki:Gadget-twinklebatchprotect.js
[MediaWiki:Gadget-twinkleconfig.js]: https://enwp.org//MediaWiki:Gadget-twinkleconfig.js
[MediaWiki:Gadget-twinklefluff.js]: https://enwp.org//MediaWiki:Gadget-twinklefluff.js
[MediaWiki:Gadget-twinkleprotect.js]: https://enwp.org//MediaWiki:Gadget-twinkleprotect.js
[MediaWiki:Gadget-twinklearv.js]: https://enwp.org//MediaWiki:Gadget-twinklearv.js
[MediaWiki:Gadget-friendlytalkback.js]: https://enwp.org//MediaWiki:Gadget-friendlytalkback.js
[MediaWiki:Gadget-twinkleblock.js]: https://enwp.org//MediaWiki:Gadget-twinkleblock.js
[select2]: https://github.com/select2/select2
[MediaWiki::API]: https://metacpan.org/pod/MediaWiki::API
[Git::Repository]: https://metacpan.org/pod/Git::Repository
[File::Slurper]: https://metacpan.org/pod/File::Slurper
[Config::General]: https://metacpan.org/pod/Config::General
[App::cpanminus]: https://metacpan.org/pod/App::cpanminus
[intadmin]: https://enwp.org//Wikipedia:Interface_administrators
[special_botpass]: https://enwp.org//Special:BotPasswords
