var Lab = Lab || {};

if ( ! window.Int32Array ) {

	window.Int32Array = Array;
	window.Float32Array = Array;

}


Lab.CheckError = function(gl, message) {
    var err = gl.getError();
    if (err != 0) {
        console.error("Error in " + message + " (#" + err + ")");
    }
}


Lab.AssertException = function (message) { this.message = message; }
Lab.AssertException.prototype.toString = function () {
  return 'AssertException: ' + this.message;
}

function assert(exp, message) {
  if (!exp) {
    throw new Lab.AssertException(message);
  }
}
