# VS other libraries

Gem borrows ideas from other libraries, but Gem still has many unique features.

### Ability

Gem is a librarie for the Web environment, so it can meet the common needs of WebApp without the need to install other dependencies, but Gem does not include UI library, nor can it build a project for you with one click.

### Write Gem App

Unlike other libraries, Gem only uses JavaScript/Typescript to write any part of WebApp, so it has no syntactic sugar, to complete the same function requires more code, of course, this is also one of the advantages of Gem, you do not need to learn additional languages.

### Performance

React calculates the vDOM of the entire component when it needs to be updated, then finds the DOM/Node that needs to be modified through comparison, and finally writes it to the DOM/Node. Gem uses a completely different method, see lit-html [document](https://github.com/Polymer/lit-html/wiki/How-it-Works), before mounting, lit-html found the DOM/Node corresponding to the data in the template string. When updating, directly put the content on the target DOM/Node. In addition, Gem uses ShadowDOM, when re-calling `render`, the content of custom elements in the template will be skipped. They are only notified of updates by the Attribute/Property/Store of the element "Observe", which will cause the Gem App to be updated in batches. There is a small task management cost.

Using Gem may cause too much ShadowDOM, which may slow down the speed of the App.
