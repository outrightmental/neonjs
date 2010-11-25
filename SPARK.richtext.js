
// SPARK richtext - rich text editing control for Javascript
// Part of the SPARK Javascript library
// Copyright (c) 2010 Thomas Rutter

// A simple, reliable, easy (for users) rich text control is needed.
// Who needs a toolbar with 63 buttons when just writing some text

/*jslint browser:true */
/*global SPARK:true */

/**
@preserve SPARK js lib (c) Thomas Rutter SPARKlib.com
*/

SPARK.richText = function(opts) {

	var
		i,
		canedit = document.body.contentEditable !== undefined;

	/*
		block level: h[1-6]|ul|ol|dl|menu|dir|pre|hr|blockquote|address|center|
			p|div|isindex|fieldset|table
		optional end tag: p
		no end tag (autoclose): hr isindex
		contains paragraphs: blockquote|address|center|div|fieldset
	*/

	// which should be added to spark core?

	// .watchoutside(callback) - run callback when event happens OUTSIDE OF
	// this element.  takes care of figuring out if the target element
	// is outside the given element
	// need an unwatchoutside?
	
	// .contains(el) - determine if selected element contains passed element

	// .flyout() - watches for click/mousein outside of parent element
	// and closes child if so.  can also help positioning child

	var htmlconvert = function(input, strippara, wstopara) {
		var
			matches,
			tagname, last,
			delta = 0, lastdelta, // delta is +1 for moving into a block, -1 for leaving, 
				// 0 for non-block
			closetag = 0, lastclose, // whether there is/was a slash to indicate close tag
			text,	tagcode,
			popen = 0, pinitially, // whether a <p> is open
			output = '',
			stack = [],
			topstack,
			parsereg = /([\s\S]*?(?=<[\/\w!])|[\s\S]+)((?:<(\/?)([\w!]+)((?:[^>"\-]+|"[\s\S]*?"|--[\s\S]*?--)*)>?)?)/g,
				// 1: text; 2: tag; 3: slash; 4: tagname; 5: tagcontents; 6: endtext;
			blockreg = /^(?:h[1-6]|ul|ol|dl|menu|dir|pre|hr|blockquote|address|center|div|isindex|fieldset|table)$/,
			blockseparator = /^(?:li|tr|div|dd|dt|the|tbo|tfo)/;

		while ((matches = parsereg.exec(input))) {

			lastdelta = delta;
			last = tagname;
			lastclose = closetag;
			delta = closetag = 0;
			tagname = 0;
			topstack = stack[stack.length-1];
			popen = pinitially =
				lastdelta ? 0 :
				last != 'p' ? popen :
				lastclose ? 0 : 1;
			if (matches[4]) {
				tagname = matches[4].toLowerCase();
				closetag = matches[3];
				if (blockreg.test(tagname)) {
					if (!closetag) {
						if (tagname != 'hr' && tagname != 'isindex') {
							delta = 1;
							stack.push(tagname);
						}
					}
					else if (tagname == topstack) {
						delta = -1;
						stack.pop();
					}
				}
			}
			text = matches[1];
			tagcode = matches[2];

			if (topstack != 'pre') {
				// process paragraphs
				if (!topstack || topstack == 'blockquote' || topstack == 'center' || popen) {
					// add missing <p> at start
					if (!popen && (/\S/.test(text) ||
						(tagname && !delta && tagname != '!' && tagname != 'p'))) {
						popen = 1;
						text = '<p>' + text.replace(/^\s*/, '');
					}
					if (popen) {
						// add missing </p> at end
						if (delta ||
							(!closetag && tagname == 'p') ||
							!tagname ||
							(wstopara && /\n\r?\n\s*$/.test(text))
							) {
							popen = 0;
							text = text.replace(/\s*$/, '') + '</p>';
						}
						// add paragraph breaks within based on whitespace
						if (wstopara) {
							if (last == 'br') {
								text = text.replace(/^\s+/, '');
							}
							text = text.replace(/\s*\n\r?\n\s*(?=\S)/g, '</p><p>')
								.replace(/\s*\n\s*/g, '<br>');
						}
					}
				}
				// remove leading spaces
				if (lastdelta || !last || !pinitially || 
					last == 'p' || last == 'br' || blockseparator.test(last)) {
					text = text.replace(/^\s+/, '');
				}
				// remove trailing spaces
				if (delta || !tagname || !popen ||
					tagname == 'p' || tagname == 'br' || blockseparator.test(tagname)) {
					text = text.replace(/\s+$/, '');
				}
				// normalise remaining whitespace
				text = text.replace(/\s+/g, ' ');
				// convert < and & where it is not part of tag or entity
				text = strippara ? 
					text.replace(/&lt;(?![\/\w!])/g, '<').replace(/&amp;(?![\w#])/g, '&') :
					text.replace(/<(?![\/\w!])/g, '&lt;').replace(/&(?![\w#])/g, '&amp;');

				// account for added para tags
				text = strippara ? text.replace(/<\/?\w+>/g, "\n") :
					text.replace(/<p>/g, "\n<p>").replace(/<\/p>/g, "</p>\n")
					.replace(/<br>/g, "<br>\n");
				// add newline at end (before tag)
				if (
					delta == 1 || (!popen && tagname == '!') || 
					(!closetag && (tagname == 'p' || blockseparator.test(tagname))) || 
					(closetag && (tagname == 'table' || tagname == 'ul'))
					) {
					text += "\n";
				}
				// add newline at start (after last tag)
				if (
					lastdelta == -1 || (!pinitially && last == '!') ||
					(lastclose && last == 'p') ||
					last == 'br') {
					text = "\n" + text;
				}
			}

			// process the actual tag
			if (strippara &&
				(tagname == 'p' || (tagname == 'br' && (!topstack ||
					topstack == 'blockquote' || topstack == 'center'))) &&
				!/\S/.test(matches[5])) {
				tagcode = '';
			}

			output += text + tagcode;
		}
		// close last p tag
		if (popen && !strippara && !delta && (tagname != 'p' || !closetag)) {
			 output += '</p>';
		}

		return output.replace(/^\s+|\s+$/g, '');
	};

	var setupeditor = function(el) {
		var
			i,
			container = el.insert({div:''}).addClass('SPARK-richtext-container'),
			editor = container.append(canedit ? {div:''} : {textarea:''})
				.addClass('SPARK-richtext-editor'),
			toolbar = editor.insert({div:''}).addClass('SPARK-richtext-toolbar'),
			source;

		if (canedit) {
			editor.setAttribute('contenteditable', 'true');
		}

		// transfer to new editor and remove old
		if (el[0].tagName.toLowerCase() == 'textarea') {
			source = el[0].value;
			editor.style('minHeight', el.getStyle('height'));
			el.insert({
				input:'',
				$type:'hidden',
				$name:el[0].name,
				$value:el[0].value,
				});
			el.remove();
		}
		else {
			source = el[0].innerHTML;
			el.style('display', 'none');
		}

		editor[0][canedit ? 'innerHTML' : 'value'] =
			htmlconvert(source, !canedit, 0);
		populatetoolbar(toolbar, canedit);
	};

	var addbutton = function(toolbar, command, num, title) {
		var
			button = toolbar.append({button:'',$title:title}),
			icon = button.append({span:""})
				.addClass('SPARK-richtext-toolbar-icon')
				.style('background', 
					'url(images/SPARK-richtext-toolbar.png) -1px -'+(16*num+1)+'px');

		button.watch('click', function() {
			document.execCommand('useCSS', 0, 1);
			document.execCommand(command, 0, null);
			updatecontrols(toolbar);
		});

	};

	var addstylechooser = function(toolbar) {
		var
			chooser = toolbar.append({span:''})
				.addClass('SPARK-richtext-toolbar-dropper'),
			button = chooser.append({button:'',$title:'Paragraph style'}),
			sample = button.append({span:'Paragraph style'})
				.addClass('SPARK-richtext-toolbar-label');
			droparrow = button.append({span:""})
				.addClass('SPARK-richtext-toolbar-icon')
				.style('background',
					'url(images/SPARK-richtext-toolbar.png) -1px -'+(16*9+1)+'px');
	};

	var updatecontrols = function(toolbar) {
		for (var i = controlcallbacks.length;i--;) {
			controlcallbacks[i]();
		}
	};

	var populatetoolbar = function(toolbar, canedit) {

		if (!canedit) {
			toolbar.append({div:"HTML tags allowed"})
				.addClass('SPARK-richtext-toolbar-altnotice');
			return;
		}

		addstylechooser(toolbar);
		addbutton(toolbar, 'bold', 0, 'Bold');
		addbutton(toolbar, 'italic', 1, 'Italic');
		addbutton(toolbar, 'insertunorderedlist', 2, 'Insert bulleted list');
		addbutton(toolbar, 'insertorderedlist', 3, 'Insert numbered list');
		addbutton(toolbar, 'outdent', 4, 'Decrease indent');
		addbutton(toolbar, 'indent', 5, 'Increase indent');
	};
	
	for (i = this.length; i--;) {
		setupeditor(SPARK.select(this[i]));
	}

	return this;
};

/************************
 *        STYLES        *
 * **********************/

SPARK.styleRule('.SPARK-richtext-container', 'border:1px solid ButtonShadow;width:auto;padding:1px;background:#fff;color:#000')
	.styleRule('.SPARK-richtext-toolbar', 'font:0.8em sans-serif;margin:0 0 1px 0;background:#f9f6f3')
	.styleRule('.SPARK-richtext-toolbar button', 'border:none;padding:0;background:transparent;overflow:visible')
	.styleRule('.SPARK-richtext-toolbar button:hover', 'background:#edd')
	.styleRule('.SPARK-richtext-editor', 'maxHeight:28em')
	
// outline:0 prevents dotted line in firefox
// position:relative is in case people paste in absolute positioned elements
	.styleRule('div.SPARK-richtext-editor', 'cursor:text;padding:1px 0 1px 2px;outline:0;position:relative;minHeight:6em;overflow:auto')

// minHeight needed as textareas don't auto-expand
	.styleRule('textarea.SPARK-richtext-editor', 'width:100%;padding:0;margin:0;background:#fff;color:#000;font:inherit;minHeight:14em')

	.styleRule('.SPARK-richtext-toolbar-altnotice', 'padding:5px;textAlign:right')
	.styleRule('.SPARK-richtext-toolbar-icon', 'display:inline-block;vertical-align:middle;margin:4px 3px 5px;width:14px;height:14px')
	.styleRule('.SPARK-richtext-toolbar-label', 'vertical-align:middle;margin: 4px 3px')
	.styleRule('.SPARK-richtext-toolbar-dropper', 'display:inline-block;position:relative');
