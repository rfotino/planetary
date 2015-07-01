var Planetary = { };

Planetary.PLAYER_SPEED = 0.025;
Planetary.PLAYER_JUMP = 12.5;
Planetary.PLANET_GRAVITY = -1;
Planetary.PLAYER_MIN_SPEED = -5;

Planetary.Player = function(game) {
    this.game = game;
    var planetImage = this.game.cache.getImage('planet');
    var spacemanImage = this.game.cache.getImage('spaceman');

    this._angle = 0;
    this._angularVelocity = 0;
    this._platformAngularVelocity = 0;

    this._radius = (planetImage.height / 2) + (spacemanImage.height / 2);
    this._prevRadius = this._radius;
    this._radialVelocity = 0;
    this._landed = false;
    this._falling = false;

    this.sprite = this.game.add.sprite(0, 0, 'spaceman');
    this.sprite.anchor.setTo(0.5, 0.5);

    this._updatePosition();
};

Planetary.Player.prototype = {
    _landedAt: function(height, angularVelocity) {
        this._radius = height;
        this._radialVelocity = 0;
        this._landed = true;
        this._platformAngularVelocity = angularVelocity;
    },
    _updateMovement: function() {
        // Do radial movements and collision first
        this._prevRadius = this._radius;
        this._radialVelocity += Planetary.PLANET_GRAVITY;
        if (this._radialVelocity < Planetary.PLAYER_MIN_SPEED) {
            this._radialVelocity = Planetary.PLAYER_MIN_SPEED;
        }
        this._radius += this._radialVelocity;
        var halfHeight = this.sprite.height / 2;
        var bottom = this._radius - halfHeight;
        var prevBottom = this._prevRadius - halfHeight;
        this._landed = false;
        // Check for collision with the planet
        if (bottom <= this.game.planet.radius) {
            this._landedAt(this.game.planet.radius + halfHeight,
                           this.game.planet.angularVelocity);
        }
        // Check for collision with the platforms
        if (!this._falling) {
            for (var i = 0; i < this.game.platforms.platformArray.length; i++) {
                var platform = this.game.platforms.platformArray[i];
                if ((platform.angle <= this._angle &&
                     this._angle <= platform.angle + platform.width) ||
                    (platform.angle <= this._angle + (Math.PI * 2) &&
                     this._angle + (Math.PI * 2) <= platform.angle + platform.width)) {
                    if (platform.height <= prevBottom &&
                        bottom < platform.height) {
                        this._landedAt(platform.height + halfHeight,
                                       platform.angularVelocity);
                    }
                }
            }
        }
        // Handle rotational movements. We could handle collisions with
        // walls at this point
        this._angle += this._angularVelocity * this.game.planet.radius / this._radius;
        this._angle += this._platformAngularVelocity;
        while (this._angle < 0) {
            this._angle += Math.PI * 2;
        }
        while (this._angle > Math.PI * 2) {
            this._angle -= Math.PI * 2;
        }
    },
    _updatePosition: function() {
        // Translate polar coordinates to Cartesian coordinates
        this.sprite.x = (this.game.world.width / 2) +
                        (this._radius * Math.sin(this._angle));
        this.sprite.y = (this.game.world.height / 2) +
                        (this._radius * -Math.cos(this._angle));
        this.sprite.rotation = this._angle;
    },
    update: function() {
        this._updateMovement();
        this._updatePosition();
    },
    moveLeft: function() {
        this._angularVelocity = -Planetary.PLAYER_SPEED;
    },
    moveRight: function() {
        this._angularVelocity = Planetary.PLAYER_SPEED;
    },
    moveClear: function() {
        this._angularVelocity = 0;
    },
    jump: function() {
        if (this._landed) {
            this._radialVelocity = Planetary.PLAYER_JUMP;
        }
    },
    fallStart: function() {
        if (this._landed) {
            this._radius--;
            this._prevRadius = this._radius;
        }
        this._falling = true;
    },
    fallStop: function() {
        this._falling = false;
    }
};

Planetary.Planet = function(game, angularVelocity) {
    if (angularVelocity === undefined) {
        angularVelocity = 0;
    }

    this.game = game;
    this.sprite = this.game.add.sprite(this.game.world.width / 2,
                                       this.game.world.height / 2,
                                       'planet');
    this.sprite.anchor.setTo(0.5, 0.5);
    this.radius = this.sprite.width / 2;
    this._angle = 0;
    this.angularVelocity = angularVelocity;
};

Planetary.Planet.prototype = {
    update: function() {
        this._angle += this.angularVelocity;
        this.sprite.rotation = this._angle;
    }
};

Planetary.Platform = function(game, angle, width,
                              height, thickness, angularVelocity) {
    this.game = game;
    this.angle = angle;
    this.width = width;
    this.height = height;
    this.thickness = thickness;
    this.graphics = this.game.add.graphics(this.game.world.width / 2,
                                           this.game.world.height / 2,
                                           this.game.platforms.group);
    this.angularVelocity = angularVelocity;
};

Planetary.Platform.prototype = {
    update: function() {
        this.angle += this.angularVelocity;
        while (this.angle < 0) {
            this.angle += Math.PI * 2;
        }
        while (this.angle > Math.PI * 2) {
            this.angle -= Math.PI * 2;
        }
        this.graphics.clear();
        this.graphics.lineStyle(this.thickness, 0xffffff);
        this.graphics.arc(0, 0, this.height - (this.thickness / 2),
                          this.angle - (Math.PI / 2),
                          this.angle + this.width - (Math.PI / 2));
    }
};

Planetary.PlatformCluster = function(game) {
    this.game = game;
    this.platformArray = [];
    this.group = this.game.add.group();
};

Planetary.PlatformCluster.prototype = {
    add: function(angle, width, height, thickness, angularVelocity) {
        if (thickness === undefined) {
            thickness = 10;
        }
        if (angularVelocity === undefined) {
            angularVelocity = 0;
        }
        var platform = new Planetary.Platform(this.game,
                                              angle, width,
                                              height, thickness,
                                              angularVelocity);
        this.platformArray.push(platform);
    },
    update: function() {
        for (var i = 0; i < this.platformArray.length; i++) {
            this.platformArray[i].update();
        }
    }
};

Planetary.Input = function(game) {
    this.game = game;
    this.cursors = this.game.input.keyboard.createCursorKeys();
    this.cursorUpArrowPrev = false;
};

Planetary.Input.prototype = {
    update: function() {
        // Check for left and right movement
        if (this.cursors.left.isDown) {
            this.game.player.moveLeft();
        } else if (this.cursors.right.isDown) {
            this.game.player.moveRight();
        } else {
            this.game.player.moveClear();
        }
        // Check for jump
        if (this.cursors.up.isDown && !this.cursorUpArrowPrev) {
            this.game.player.jump();
        }
        this.cursorUpArrowPrev = this.cursors.up.isDown;
        // Check for fall
        if (this.cursors.down.isDown) {
            this.game.player.fallStart();
        } else {
            this.game.player.fallStop();
        }
    }
};

Planetary.Game = function(width, height, container) {
    if (width === undefined) {
        width = 800;
    }
    if (height === undefined) {
        height = 600;
    }
    if (container === undefined) {
        container = '';
    }
    this.game = new Phaser.Game(width, height, Phaser.AUTO, container);
    this.game.state.add('Planetary', this, true);
};

Planetary.Game.prototype = {
    preload: function() {
        this.load.image('planet', 'assets/planet.png');
        this.load.image('spaceman', 'assets/spaceman.png');
    },

    create: function() {
        this.planet = new Planetary.Planet(this);
        this.player = new Planetary.Player(this);
        this.inputHandler = new Planetary.Input(this);
        this.platforms = new Planetary.PlatformCluster(this);
        this.platforms.add(0, Math.PI / 3, 155, 10, 0.02);
        this.platforms.add(Math.PI / 6, Math.PI / 3, 185, 10, 0.01);
        this.platforms.add(Math.PI / 3, Math.PI / 3, 215, 10, 0.005);
        this.platforms.add(Math.PI / 2, Math.PI / 3, 245, 10, -0.01);

        this.game.scale.fullScreenScaleMode = Phaser.ScaleManager.NO_SCALE;
        this.game.input.onDown.add(function() { this.scale.startFullScreen(false); }, this);
    },

    update: function() {
        this.inputHandler.update();
        this.player.update();
        this.planet.update();
        this.platforms.update();
        this.world.bringToTop(this.player.sprite);
    }
};
