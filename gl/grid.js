
Lab.Grid = function(x1, z1, x2, z2, y) {
    var DEF_SIZE = 5;
    this.x1 = x1 || -DEF_SIZE;
    this.x2 = x2 ||  DEF_SIZE;
    this.z1 = z1 || -DEF_SIZE;
    this.z2 = z2 ||  DEF_SIZE;
    this.y  = y || 0;
    this.lines = new Lab.Geom.Lines();

    this.init = function(gl) {
        for (var x = this.x1; x <= this.x2; x++) {
           this.lines.push(x, this.z1, x, this.z2, this.y);
        }
        for (var z = this.z1; z <= this.z2; z++) {
           this.lines.push(this.x1, z, this.x2, z, this.y);
        }
        this.lines.init(gl);
    };

    this.draw = function(gl, prog) {
        this.lines.draw(gl, prog);
    };
};


