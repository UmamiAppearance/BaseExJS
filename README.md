# BaseEx

[![License](https://img.shields.io/github/license/UmamiAppearance/BaseExJs?color=009911&style=for-the-badge)](./LICENSE)
[![npm](https://img.shields.io/npm/v/base-ex?color=%23009911&style=for-the-badge)](https://www.npmjs.com/package/base-ex)


**BaseEx** is a collection of classes for data representation from Base16 (hex) to BasE91.
BaseEx is completely standalone and works client and server side.
There are other good solutions for e.g. Base32, Base64, Base85, but BaseEx has them all in one place.
The **Ex** in the name stands for **Ex**ponent (of n) or - as read out loud - for an **X**.


### Available converters:
* ``Base16``
* ``Base32 (RFC 3548 and RFC 4648)``
* ``Base64 (standard and urlsafe)``
* ``Base85 (adobe/ascii85 and z85)``
* ``Base91``


## Installation

### GitHub
```sh
git clone https://github.com/UmamiAppearance/BaseExJS.git
```

### npm
```sh
nmp install base-ex
```

## Build
The GitHub repository has ready to use builds included. You can find them in [dist](https://github.com/UmamiAppearance/BaseExJS/tree/main/dist). The npm package comes without pre build files. 

For building you have to run:

```sh
npm run build
``` 

Either way you have two builds available ([esm](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) and [iife](https://developer.mozilla.org/en-US/docs/Glossary/IIFE)), plus a minified version of each. 
* ``BaseEx.esm.js``
* ``BaseEx.esm.min.js``
* ``BaseEx.iife.js``
* ``BaseEx.iife.min.js``

If you need to use BaseEx in your browser with a classic script tag, use a ``iife`` version. For modular usage ``esm``.


## Usage

### Importing

#### Browser

```html
<!-- the classic -->
<script src="path/BaseEx.iife.min.js"></script>
```

```js
// ESM6 module

// main class
import {BaseEx} from "./path/BaseEx.esm.min.js"

// explicit converter (e.g. Base32)
import {Base32} from "./path/BaseEx.esm.min.js"
```

#### Node
```js
// main class
import {BaseEx} from "base-ex"

// explicit converter (e.g. Base32)
import {Base32} from "base-ex"
```

#### Available imports Browser/Node
The **classic import** via script tag has them all available without further ado. As it is a [iife](https://developer.mozilla.org/en-US/docs/Glossary/IIFE), everything is available under the scope of ``BaseEx``.

* ``BaseEx.Base16``
* ``BaseEx.Base32``
* ...
* ``BaseEx.BaseEx``

Full **import** for **ES6** modules: 

```js
// browser
import {Base16, Base32, Base64, Base85, Base91, BaseEx} from "./path/BaseEx.esm.min.js"

// node
import {Base16, Base32, Base64, Base85, Base91, BaseEx} from "base-ex"
```

### Working with it (Browser/Node)
Try out the [Demopage](https://umamiappearance.github.io/BaseExJS/demo.html). You'll find an online base converter and code examples that will work independently from your environment.

## License
This work is licensed under [GPL-3.0](https://opensource.org/licenses/GPL-3.0).

### 3rd Party License

The basE91 en-/decoder relies on the work of Joachim Henke. The original code is licensed under [BSD-3-Clause](https://opensource.org/licenses/BSD-3-Clause). His method was transpiled to JavaScript with small adjustments to fit the needs of this software.

```
Copyright (c) 2000-2006 Joachim Henke
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

  - Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  - Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.
  - Neither the name of Joachim Henke nor the names of his contributors may be
    used to endorse or promote products derived from this software without
    specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```
