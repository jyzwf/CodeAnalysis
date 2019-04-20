/**
 * Not type-checking this file because it's mostly vendor code.
 */

/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

import { makeMap, no } from "shared/util";
import { isNonPhrasingTag } from "web/compiler/util";

// Regular Expressions for parsing tags and attributes
// 匹配一个或多个非空白字符，非"'<>/=字符，并捕获匹配到的内容，主要用于匹配属性名
// "/abc'de<".match(singleAttrIdentifier)
// ["abc", "abc", index: 1, input: "/abc'de<"]
const singleAttrIdentifier = /([^\s"'<>/=]+)/;

// 匹配一个=，但不捕获
const singleAttrAssign = /(?:=)/;

const singleAttrValues = [
  // attr value double quotes
  /"([^"]*)"+/.source, // 捕获双引号括起来的非"内容
  // attr value, single quotes
  /'([^']*)'+/.source, // 捕获单引号括起来的非'内容
  // attr value, no quotes
  /([^\s"'=<>`]+)/.source // 多个非空白字符或非"'=<>``字符的内容
];

// 匹配一个完整的属性，并且允许属性名、等号、属性值之前可以有多个空白字符
const attribute = new RegExp(
  "^\\s*" +
  singleAttrIdentifier.source + // 匹配属性名
  "(?:\\s*(" +
  singleAttrAssign.source +
  ")" + // 等号，左右可以有空格
    "\\s*(?:" +
    singleAttrValues.join("|") +
    "))?" // 匹配属性值 -> = 后面可以有也可以没有，如v-bind:a.b.c
);

// could use https://www.w3.org/TR/1999/REC-xml-names-19990114/#NT-QName
// but for Vue templates we can enforce a simple charset
// 以a-zA-Z_开头，然后是0或多个a-zA-Z_、-或.
const ncname = "[a-zA-Z_][\\w\\-\\.]*";
// 匹配ncname开头，紧跟着一个冒号，然后又跟着一个ncname，捕获整体匹配的内容
const qnameCapture = "((?:" + ncname + "\\:)?" + ncname + ")";

// 匹配起始标签，我们的标签有字母、下划线、中划线或点组成，因为可能有命名空间
const startTagOpen = new RegExp("^<" + qnameCapture);
// 匹配起始标签的结束部分，这里做了单标签的区分，单标签匹配的第二个元素是/
const startTagClose = /^\s*(\/?)>/;

// 匹配双标签的结束标签。以<开始，然后是/，然后是标签名qnameCapture，接着是0或多个非>，
// 最后是>。其中捕获是qnameCapture进行的
const endTag = new RegExp("^<\\/" + qnameCapture + "[^>]*>");
/*匹配<!DOCTYPE> 标签*/
const doctype = /^<!DOCTYPE [^>]+>/i;
/*匹配注释*/
const comment = /^<!--/;
// <![if !IE]>
// <link href="non-ie.css" rel="stylesheet">
// <![endif]>
const conditionalComment = /^<!\[/;

let IS_REGEX_CAPTURING_BROKEN = false;
"x".replace(/x(.)?/g, function(m, g) {
  IS_REGEX_CAPTURING_BROKEN = g === "";
});

// Special Elements (can contain anything)
/*返回一个函数用以检测传入的key值是否为script、style或者是textarea*/
export const isPlainTextElement = makeMap("script,style,textarea", true);
const reCache = {};

/*转义表*/
const decodingMap = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&amp;": "&",
  "&#10;": "\n"
};
const encodedAttr = /&(?:lt|gt|quot|amp);/g;
const encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#10);/g;

function decodeAttr(value, shouldDecodeNewlines) {
  const re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr;
  return value.replace(re, match => decodingMap[match]);
}

/*解析HTML*/
export function parseHTML(html, options) {
  const stack = [];
  const expectHTML = options.expectHTML;
  const isUnaryTag = options.isUnaryTag || no;
  const canBeLeftOpenTag = options.canBeLeftOpenTag || no;
  let index = 0;
  let last, lastTag;
  while (html) {
    // last用于保存还没有解析的模板部分
    last = html;
    // Make sure we're not in a plaintext content element like script/style
    /*保证lastTag不是纯文本标签，比如script、style以及textarea*/
    if (!lastTag || !isPlainTextElement(lastTag)) {
      let textEnd = html.indexOf("<");

      if (textEnd === 0) {
        // 开头就是 < 符号
        // Comment:
        /*如果是注释则直接去除*/
        if (comment.test(html)) {
          const commentEnd = html.indexOf("-->");

          if (commentEnd >= 0) {
            advance(commentEnd + 3);
            continue;
          }
        }

        // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
        // 然后过滤<![和]>注释的内容。
        if (conditionalComment.test(html)) {
          const conditionalEnd = html.indexOf("]>");

          if (conditionalEnd >= 0) {
            advance(conditionalEnd + 2);
            continue;
          }
        }

        // Doctype:
        /*<!DOCTYPE>标签不需要处理直接去除*/
        const doctypeMatch = html.match(doctype);
        if (doctypeMatch) {
          advance(doctypeMatch[0].length);
          continue;
        }

        // End tag: new RegExp('^<\\/' + qnameCapture + '[^>]*>')
        // </
        const endTagMatch = html.match(endTag);
        if (endTagMatch) {
          const curIndex = index;
          advance(endTagMatch[0].length); // </xxx>
          parseEndTag(endTagMatch[1], curIndex, index); // "xxx"
          continue;
        }

        // Start tag:
        const startTagMatch = parseStartTag();
        if (startTagMatch) {
          handleStartTag(startTagMatch);
          continue;
        }
      }

      let text, rest, next;
      // 666666666666666666666666666666666
      if (textEnd >= 0) {
        rest = html.slice(textEnd);
        // 如果文本中包含了<，rest会等于从<开始的文本，
        // 然后如果rest不是结束标签、不是起始标签、不是注释，
        // 则说明它在文本中，之后跳过<继续向后寻找，以此循环
        while (
          !endTag.test(rest) &&
          !startTagOpen.test(rest) &&
          !comment.test(rest) &&
          !conditionalComment.test(rest)
        ) {
          // < in plain text, be forgiving and treat it as text
          next = rest.indexOf("<", 1);
          if (next < 0) break;
          textEnd += next;
          rest = html.slice(textEnd);
        }
        text = html.substring(0, textEnd);
        advance(textEnd);
      }

      // 这种情况是： textEnd = 0，然后next没有找到 < ，这样就是 -1，表明后面都是文本，查找结束
      // 这里可以对上一步 文本中只有一个 < 且 < 后无 < 的文本做一个补充
      if (textEnd < 0) {
        text = html;
        html = "";
      }

      // char 用于解析文本
      if (options.chars && text) {
        options.chars(text);
      }
    } else {
      var stackedTag = lastTag.toLowerCase();
      var reStackedTag =
        reCache[stackedTag] ||
        (reCache[stackedTag] = new RegExp(
          "([\\s\\S]*?)(</" + stackedTag + "[^>]*>)",
          "i"
        ));
      var endTagLength = 0;
      var rest = html.replace(reStackedTag, function(all, text, endTag) {
        endTagLength = endTag.length;
        if (!isPlainTextElement(stackedTag) && stackedTag !== "noscript") {
          text = text
            .replace(/<!--([\s\S]*?)-->/g, "$1")
            .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, "$1");
        }
        if (options.chars) {
          options.chars(text);
        }
        return "";
      });
      index += html.length - rest.length;
      html = rest;
      parseEndTag(stackedTag, index - endTagLength, index);
    }

    if (html === last) {
      options.chars && options.chars(html);
      if (
        process.env.NODE_ENV !== "production" &&
        !stack.length &&
        options.warn
      ) {
        options.warn(`Mal-formatted tag at end of template: "${html}"`);
      }
      break;
    }
  }

  // Clean up any remaining tags
  /*清楚多余的标签*/
  parseEndTag();

  /*为计数index加上n，同时，使html到n个字符以后到位置作为起始位*/
  function advance(n) {
    index += n;
    html = html.substring(n);
  }

  function parseStartTag() {
    const start = html.match(startTagOpen);
    if (start) {
      const match = {
        tagName: start[1], // 获取标签名
        attrs: [],
        start: index // 标签名开始的位置
      };
      advance(start[0].length);
      let end, attr;
      // 匹配属性直到起始标签结束
      // ！ 先于 &&
      while (
        !(end = html.match(startTagClose)) &&
        (attr = html.match(attribute))
      ) {
        advance(attr[0].length);
        match.attrs.push(attr);
      }
      if (end) {
        // unarySlash ：表示是否是单标签，不是的话返回 ''，是的话返回 /
        match.unarySlash = end[1];
        advance(end[0].length);
        match.end = index;
        return match;
      }
    }
  }

  function handleStartTag(match) {
    const tagName = match.tagName;
    const unarySlash = match.unarySlash;

    if (expectHTML) {
      if (lastTag === "p" && isNonPhrasingTag(tagName)) {
        parseEndTag(lastTag);
      }
      if (canBeLeftOpenTag(tagName) && lastTag === tagName) {
        parseEndTag(tagName);
      }
    }

    const unary =
      isUnaryTag(tagName) ||
      (tagName === "html" && lastTag === "head") ||
      !!unarySlash;

    const l = match.attrs.length;
    const attrs = new Array(l);
    for (let i = 0; i < l; i++) {
      // 只要处理attr ，将attrs数组里面的各个attr都变成{name:'xxx',value:'xxx'}形式
      const args = match.attrs[i];
      // hackish work around FF bug https://bugzilla.mozilla.org/show_bug.cgi?id=369778
      // IS_REGEX_CAPTURING_BROKEN = false  -> google
      if (IS_REGEX_CAPTURING_BROKEN && args[0].indexOf('""') === -1) {
        if (args[3] === "") {
          delete args[3];
        }
        if (args[4] === "") {
          delete args[4];
        }
        if (args[5] === "") {
          delete args[5];
        }
      }
      // 分别对应双引号、单引号、无单双引号情况，看哪一个先匹配到
      const value = args[3] || args[4] || args[5] || "";
      attrs[i] = {
        name: args[1],
        value: decodeAttr(
          // 解码
          value,
          options.shouldDecodeNewlines
        )
      };
    }

    if (!unary) {
      // 不是一元标签就直接入栈，以便匹配后面对应的标签
      stack.push({
        tag: tagName,
        lowerCasedTag: tagName.toLowerCase(),
        attrs: attrs
      });
      lastTag = tagName;
    }

    if (options.start) {
      // 执行传进来的start函数
      options.start(tagName, attrs, unary, match.start, match.end);
    }
  }

  function parseEndTag(tagName, start, end) {
    let pos, lowerCasedTagName;
    if (start == null) start = index;
    if (end == null) end = index;

    if (tagName) {
      lowerCasedTagName = tagName.toLowerCase();
    }

    // Find the closest opened tag of the same type
    if (tagName) {
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break;
        }
      }
    } else {
      // If no tag name is provided, clean shop
      pos = 0;
    }

    if (pos >= 0) {
      // Close all the open elements, up the stack
      // 因为是栈，所以从length到0递减，只能从栈顶一个个向下退出栈
      for (let i = stack.length - 1; i >= pos; i--) {
        if (
          process.env.NODE_ENV !== "production" &&
          (i > pos || !tagName) &&
          options.warn
        ) {
          options.warn(`tag <${stack[i].tag}> has no matching end tag.`);
        }
        if (options.end) {
          options.end(stack[i].tag, start, end);
        }
      }

      // Remove the open elements from the stack
      // 同样出栈
      stack.length = pos;
      lastTag = pos && stack[pos - 1].tag;
    } else if (lowerCasedTagName === "br") {
      if (options.start) {
        options.start(tagName, [], true, start, end);
      }
    } else if (lowerCasedTagName === "p") {
      if (options.start) {
        options.start(tagName, [], false, start, end);
      }
      if (options.end) {
        options.end(tagName, start, end);
      }
    }
  }
}
