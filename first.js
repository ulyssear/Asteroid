

let paused = false

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

canvas.width = canvas.offsetWidth
canvas.height = canvas.offsetHeight

class Entity {
    static DEFAULT() {
        return {
            name: "Un nom",
            position: [
                canvas.width / 2,
                canvas.height / 2
            ],
            points: [],
            clones: {
                left: false, right: false, top: false, bottom: false
            },
            velocity: [0, 0],
            rotationVelocity: 0,
            rotation: 0,
            size: 30,
            color: 'white',
            friction: .965,
            isClone: false
        }
    }

    constructor(params = {}) {
        params = Object.assign(Ship.DEFAULT(), params)
        for (let key in params) this[key] = params[key]
    }

}

class Ship extends Entity {

    static DEFAULT() {
        return {
            // firepower: 0,
            // accuracy: 0,
            speed: 0,
            bullets: [],
            canFire: true,
            // direction: 0,
            // id: 0,
            // isAlive: true,
            // isColliding: false,
            // isDead: false,
            // isHitByBullet: false,
            // isHitByShip: false,
            // isHitByMine: false,
            // isHitByTorpedo: false
        }
    }

    constructor(params = {}) {
        super(params)
        params = {
            ...Entity.DEFAULT(),
            ...Ship.DEFAULT(),
            ...params
        }
        for (let key in params) this[key] = params[key]
        this.points = [
            [-this.size / 3, this.size / 3],
            [0, -this.size / 2],
            [this.size / 3, this.size / 3]
        ]
        this.rotation = -90
        this.draw()
    }

    draw() {
        drawEntity(this)
        try {
            // updates bullets
            this.bullets.forEach(bullet => {
                bullet.move()
                if (isOutOfCanvas(bullet.position)) {
                    this.bullets.splice(this.bullets.indexOf(bullet), 1)
                    return
                }
                bullet.draw()
            })
        } catch (error) {
            console.error(error)
        }
    }

    rotateLeft() {
        const angle = 4
        this.rotationVelocity = -angle * Math.PI / 180;
        this.rotation = (this.rotation - angle) % 360;
        rotate(this)
    }

    rotateRight() {
        const angle = 4
        this.rotationVelocity = angle * Math.PI / 180;
        this.rotation = (this.rotation + angle) % 360;
        rotate(this)
    }

    accelerate() {
        this.speed += .45;
        this.velocity = [this.speed * Math.cos(this.rotation * Math.PI / 180), this.speed * Math.sin(this.rotation * Math.PI / 180)]
        const decimals = 5 * 10
        this.velocity = [Math.round(this.velocity[0] * decimals) / decimals, Math.round(this.velocity[1] * decimals) / decimals]
        this.speed = Math.round(this.speed * decimals) / decimals
    }

    move() {
        let [vx, vy] = this.velocity
        this.position = translatePoints([this.position], this.velocity)[0]
        vx *= this.friction;
        vy *= this.friction;
        this.speed *= this.friction;
        this.velocity = [Math.round(vx * 1000) / 1000, Math.round(vy * 1000) / 1000]
        this.speed = Math.round(this.speed * 1000) / 1000
        if (this.speed < 0.02) {
            this.speed = 0
            this.velocity = [0, 0]
        }
    }

    fire() {
        if (!this.canFire) return
        this.canFire = false
        let bullet
        const {position,rotation} = this
        bullet = new Bullet({position, rotation});
        this.bullets.push(bullet);
    }

}

class Bullet extends Entity {
    static DEFAULT() {
        return {
            friction: 1,
            speed: 5,
            points: [ [0,0] ]
        }
    }

    constructor(params = {}) {
        super(params)
        params = {
            ...Entity.DEFAULT(),
            ...Bullet.DEFAULT(),
            ...params
        }
        for (let key in params) this[key] = params[key]
        this.velocity = [Math.cos(this.rotation * Math.PI / 180) * this.speed, Math.sin(this.rotation * Math.PI / 180) * this.speed]
        this.draw()
    }

    // Move bullet
    move() {
        this.position = translatePoints([this.position], this.velocity)[0]
        this.velocity = this.velocity.map(e=>e*this.friction)
        this.speed = Math.sqrt(this.velocity[0] ** 2 + this.velocity[1] ** 2)
    }

    // Draw bullet
    draw() {
        // Store position in variables x, y
        const [x, y] = this.position;
        // Draw bullet
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

}

class Asteroid extends Entity {

    static DEFAULT() {
        return {
            friction: 1,
            size: 5,
            position: [0,0],
            rotation: 0,
        }
    }

    constructor(params = {}) {
        super(params)
        params = {
            ...Entity.DEFAULT(),
            ...Asteroid.DEFAULT(),
            ...params
        }
        for (let key in params) this[key] = params[key]
        this.size = Math.floor(Math.random() * 8 + 5)
        this.position = [Math.round(Math.random() * (canvas.width - 400) + 200), Math.round(Math.random() * (canvas.height - 400) + 200)]
        this.rotation = Math.floor(Math.random() * 360)
        this.velocity = [Math.cos(this.rotation * Math.PI / 180) * 1, Math.sin(this.rotation * Math.PI / 180) * 1];
        this.points = this.createPoints();
        this.clones = {
            left: false,
            right: false,
            top: false,
            bottom: false
        };
    }

    createPoints() {
        let angle = 0;
        const points = [];
        // generates a polygon with this.size faces and stores it in points
        /*for (let i = 0; i < this.size; i++) {
            const x = 8 * this.size * Math.cos(angle * Math.PI / 180) - 4;
            const y = 8 * this.size * Math.sin(angle * Math.PI / 180) - 4;
            points.push([x, y]);
            angle += 360 / this.size;
        }*/

        // generates a polygon with this.size faces with x,y with a random distance from the center of [x,y] and stores it in points
        for (let i = 0; i < this.size; i++) {
            const x = 8 * this.size * Math.cos(angle * Math.PI / 180) - 4;
            const y = 8 * this.size * Math.sin(angle * Math.PI / 180) - 4;
            points.push([x + Math.random() * (2*this.size) - 8, y + Math.random() * (2*this.size) - 8]);
            angle += 360 / this.size;
        }
        return points;
    }

    move() {
        this.position = translatePoints([this.position], this.velocity)[0];
    }

    draw() {
        try {
            this.move()
            checkBoundaries(this)
            updateOutOfBounds(this)

            ctx.fillStyle = "red"
            ctx.fillRect(...this.position, 2, 2)

            ctx.beginPath()
            ctx.moveTo(...this.position)
            ctx.lineTo(this.position[0] + Math.cos(this.rotation * Math.PI / 180) * 18, this.position[1] + Math.sin(this.rotation * Math.PI / 180) * 18)
            ctx.strokeStyle = "red"
            ctx.stroke()

            ctx.beginPath()
            ctx.arc(...this.position, this.size / 2, 0, 2 * Math.PI)
            ctx.fillStyle = "green"
            ctx.fill()

            const [x, y] = this.position

            for (let i = 0; i < this.points.length; i++) {
                const [x1, y1] = this.points[i];
                const [x2, y2] = this.points[(i + 1) % this.points.length];
                drawLine(this.position, [x1, y1], [x2, y2], this.color);
                drawPoint(1, [x1 + x, y1 + y], 'red');
            }

            drawClones(this)

        } catch (error) {
            console.log(error)
        }

    }

    static generate(n = 1, asteroids = []) {
        if (n > 0) {
            const asteroid = new Asteroid();

            /*const isColliding = (() => {
                for (let i = 0; i < asteroids.length; i++) {
                    if (collision(asteroids[i], asteroid)) return true
                }
                return false
            })()*/

            const isColliding = false

            if (!isColliding) {
                asteroids.push(asteroid);
                return Asteroid.generate(n - 1, asteroids);
            }
            return Asteroid.generate(n, asteroids);
        }
        return asteroids
    }

    // static function to generate n asteroids at a position where there is nothing
    static generateAt(n, position) {
        const asteroids = [];
        for (let i = 0; i < n; i++) {
            const asteroid = new Asteroid({position});
            asteroids.push(asteroid);
        }
        return asteroids;
    }

}

function checkBoundaries(entity) {
    const clones = {
        left: false,
        right: false,
        top: false,
        bottom: false
    }
    const [cx, cy] = entity.position;
    for (let i = 0; i < entity.points.length; i++) {
        const [x, y] = entity.points[i];
        if (x + cx < 0 || x + cx > canvas.width || y + cy < 0 || y + cy > canvas.height) {
            const bounds = {
                left: x + cx < 0,
                right: x + cx > canvas.width,
                top: y + cy < 0,
                bottom: y + cy > canvas.height
            }
            for (let bound in bounds) clones[bound] = bounds[bound]

        }
    }
    entity.clones = clones
}

function drawLine([cx, cy], [x1, y1], [x2, y2], color) {
    ctx.beginPath();
    ctx.moveTo(x1 + cx, y1 + cy);
    ctx.lineTo(x2 + cx, y2 + cy);
    ctx.strokeStyle = color;
    ctx.stroke();
}

function drawPoint(size, [x, y], color) {
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()
}

function translatePoints(points, [dx, dy]) {
    return points.map(([x, y]) => [x + dx, y + dy])
}

function updateOutOfBounds(entity) {
    const {clones,position,points} = entity
    const [cx,cy] = position
    if (Object.values(clones).includes(true)) {
        const key = Object.keys(clones).find(key => clones[key])
        const [dx, dy] = {
            left: [canvas.width, 0],
            right: [-canvas.width, 0],
            top: [0, canvas.height],
            bottom: [0, -canvas.height]
        }[key]

        const isFullyOutOfBounds = points.map((([x,y])=>[x+cx,y+cy])).map(isOutOfCanvas).reduce((a, b) => a && b)
        if (isFullyOutOfBounds) {
            entity.position = translatePoints([position], [dx, dy])[0]
            entity.clones[key] = false
        }
    }
}

function drawClones(entity) {
    let clonesPoints = [], points = []
    const [x,y] = entity.position
    if (entity.clones.left) {
        points = translatePoints(entity.points, [canvas.width, 0])
        clonesPoints.push(points)
    }
    if (entity.clones.right) {
        points = translatePoints(entity.points, [-canvas.width, 0])
        clonesPoints.push(points)
    }
    if (entity.clones.top) {
        points = translatePoints(entity.points, [0, canvas.height])
        clonesPoints.push(points)
    }
    if (entity.clones.bottom) {
        points = translatePoints(entity.points, [0, -canvas.height])
        clonesPoints.push(points)
        // clonesPoints.push(entity.points.map(([x, y]) => [x, canvas.height + y]))
    }

    for (let _clone in clonesPoints) {
        const clone = clonesPoints[_clone]
        for (let j = 0; j < clone.length; j++) {
            const [x1, y1] = clone[j];
            const [x2, y2] = clone[(j + 1) % clone.length];
            drawLine(entity.position, [x1, y1], [x2, y2], entity.color);
            drawPoint(1, [x1 + x, y1 + y], entity.color);
        }
    }
}

function isOutOfBounds(entity) {
    let outOfBounds = 0;
    const [cx, cy] = entity.position
    for (let i = 0; i < entity.points.length; i++) {
        const [x, y] = entity.points[i];
        if (x + cx < 0 || x + cx > canvas.width || y + cy < 0 || y + cy > canvas.height) outOfBounds++;
    }
    return outOfBounds === entity.points.length
}

function rotate(entity) {
    entity.points = genericRotate(entity.points, entity.rotationVelocity)
}

function genericRotate(points, rotationVelocity = 0) {
    return points.map(point => rotatePoint(point, rotationVelocity))
}

function rotatePoint([x, y], rotation = 0) {
    return [x * Math.cos(rotation) - y * Math.sin(rotation), x * Math.sin(rotation) + y * Math.cos(rotation)];
}

function drawEntity(entity) {
    try {
        entity.move()
        checkBoundaries(entity)
        drawClones(entity)
        updateOutOfBounds(entity)

        const { rotation, position, speed } = entity
        const [x, y] = position

        ctx.beginPath()
        ctx.moveTo(...position)
        ctx.lineTo(x + Math.cos(rotation * Math.PI / 180) * (2 * speed), y + Math.sin(rotation * Math.PI / 180) * (2 * speed))
        ctx.strokeStyle = "red"
        ctx.stroke()

        for (let i = 0; i < entity.points.length; i++) {
            const [x1, y1] = entity.points[i]
            const [x2, y2] = entity.points[(i + 1) % entity.points.length]
            drawLine(position, [x1, y1], [x2, y2], entity.color)
            drawPoint(1, [x1 + x, y1 + y], 'red');
        }

    } catch (error) {
        console.error(error)
    }
}

// function to check is point [x,y] is out of canvas
function isOutOfCanvas([x, y]) {
    return x < 0 || x > canvas.width || y < 0 || y > canvas.height
}

// entity1 and entity2 are polygons with this.size faces and points stored in this.points such as [ [x0,y1], [x1,y1] ...] and position [x,y] properties
function collision(entity1, entity2) {
    for (let i = 0; i < entity1.points.length; i++) {
        let [x1, y1] = entity1.points[i]
        let [x2, y2] = entity1.points[(i + 1) % entity1.points.length]
        // if entity1 is a point, so use entity1.velocity as line
        if (entity1.points.length === 1) {
            [x1, y1] = [...entity1.position]
            [x2, y2] = [x1 + entity1.velocity[0], y1 + entity1.velocity[1]]
        }
        const [cx1, cy1] = entity1.position
        for (let j = 0; j < entity2.points.length; j++) {
            // if entity2 isnt near of entity1 in a certain distance, dont check collision
            const [cx2,cy2] = entity2.position
            if (Math.abs(cx1 - cx2) > (entity1.size * 4) || Math.abs(cy1 - cy2) > (entity1.size * 4)) continue
            let [x3, y3] = entity2.points[j]
            let [x4, y4] = entity2.points[(j + 1) % entity2.points.length]
            // if entity2 is a point, same thing
            if (entity2.points.length === 1) {
                [x3, y3] = entity2.position
                [x4, y4] = [x3 + entity2.velocity[0], y3 + entity2.velocity[1]]
            }
            
            // if entity1 is a point drawPoint, else drawLine
            if (entity1.points.length === 1) drawPoint(1, [x1 + cx1, y1 + cy1], 'red');
            else drawLine(entity1.position, [x1, y1], [x2, y2], 'red')
            // same thing for entity2
            if (entity2.points.length === 1) drawPoint(1, [x3 + cx2, y3 + cy2], 'red');
            else drawLine(entity2.position, [x3, y3], [x4, y4], 'red')

            // detect collision between ([x1,y1],[x2,y2]) and ([x3,y3],[x4,y4])
        }
    }
    return false
}


// retrieve the point of intersection of two lines
function getIntersection([x1, y1], [x2, y2], [x3, y3], [x4, y4]) {
    const a = y2 - y1;
    const b = x1 - x2;
    const c = x2 * y1 - x1 * y2;
    const d = a * x1 + b * y1 + c;
    const e = a * x2 + b * y2 + c;
    const f = a * x3 + b * y3 + c;
    const g = a * x4 + b * y4 + c;
    const x = (d * e - b * f) / (a * e - b * g);
    const y = (d - a * x) / b;
    return [x, y]
}


const ship = new Ship();

const asteroids = Asteroid.generate(9);

let controls = {
    'rotate left': {
        keys: ['ArrowLeft', 'q'],
        action: ship.rotateLeft
    },
    'rotate right': {
        keys: ['ArrowRight', 'd'],
        action: ship.rotateRight
    },
    'accelerate': {
        keys: ['ArrowUp', 'z'],
        action: ship.accelerate
    },
    'fire': {
        keys: ['Enter', ' '],
        action: ship.fire
    },
    'pause': {
        keys: ['p'],
        action: () => {
            paused = !paused
        },
        canOnPause: true
    }
}


for (let key in controls) {
    controls[key].canOnPause = controls[key].canOnPause ?? false
    controls[key].lastTimeUsed = null
}

let keysPressed = {}


window.addEventListener('keyup', (e) => {
    delete keysPressed[e.key]
    if (controls.fire.keys.every(value => !Object.keys(keysPressed).includes(value))) ship.canFire = true
})

window.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true
})



let lastTime = Date.now();
const draw = () => {

    try {
        for (let keyPressed in keysPressed) {
            for (let control in controls) {
                if (controls[control].keys.includes(keyPressed)) {
                    if (!paused || (paused && controls[control].canOnPause)){
                        if ('pause' === control) {
                            // if the lastTimeUsed was not 1 second so dont execute the action
                            if (Date.now() - controls[control].lastTimeUsed > 100) {
                                controls[control].action.bind(ship)()
                                controls[control].lastTimeUsed = Date.now()
                            }
                        }
                        else {
                            controls[control].action.bind(ship)()
                        }
                    }
                }
            }
        }
    }
    catch (e) {
        console.error(e)
    }

    if (paused) {
        setTimeout(()=>requestAnimationFrame(draw), 1)
        return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ship.draw();
    asteroids.forEach(asteroid => {
        // detect collision between ship and asteroids
        if (collision(ship, asteroid)) {
            ship.explode()
        }

        // detect collision between asteroids and asteroids
        /*asteroids.filter(asteroid2 => asteroid !== asteroid2).forEach(asteroid2 => {
            if (collision(asteroid, asteroid2)) {
                asteroid.explode()
                asteroid2.explode()
            }
        })*/

        ship.bullets.forEach((bullet,i) => {
            const isColliding = collision(bullet, asteroid)
            if (isColliding) {
                // asteroid.explode.bind(asteroid)()
                ship.bullets.splice(i,1)
            }
        })
        
        asteroid.draw()
    })
    ctx.fillStyle = "white"
    ctx.font = "10px Arial"
    ctx.fillText(`${ship.position}`, 10, 40)
    ctx.fillText(`${ship.speed}`, 10, 55)
    if (ship.bullets[0]) ctx.fillText(`${ship.bullets[0].position}`, 10, 70)
    ctx.font = "20px Arial";
    ctx.fillStyle = "white";
    ctx.fillText(`FPS: ${Math.round(1000 / (Date.now() - lastTime))}`, 10, 20);

    lastTime = Date.now();
    requestAnimationFrame(draw);
}

draw()
