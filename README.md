# Cubic Dub WebGL Demo

View the live demo here: [visualcore.com/webgl/cubicdub](http://visualcore.com/webgl/cubicdub)

### Project Layout

**/core**
Very basic infrastructure for the rest of the demo. automate.js was intended to 
be used with an HTML5 synth, but got cut from the final demo. lab.js provides a
namespace in which all other effects are nested, as well as some error handling
mechanisms. trace.js provides profiling tools for performance.

**/css**
Styles for the markup to keep index.html clean.

**/gl**
All the effects and WebGL components are in here, the file names describe the 
contents pretty well. The shaders for the various effects are in-lined in 
index.html.

**/lib**
The minimal libraries used for webgl support. These are the libraries provided by
Khronos along with the excellent gl-matrix, by Brandon Jones.

**anim.js**
The transitions for the various effects.

**index.html**
The core shaders and glue for the demo.

**main.js**
The "production" javascript code. Much like a monolithic shader, all effects are
embodied in this file as a state machine that can be controlled via exposed knobs.

**deubstep-5.ogg**
The music. I made this with an off-line sequencer/software-synth.


### License
This work is licensed under a [Creative Commons Attribution-ShareAlike 3.0 Unported License](http://creativecommons.org/licenses/by-sa/3.0/deed.en_US)
