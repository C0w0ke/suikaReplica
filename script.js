import { fruitsData } from "./fruits.js";
import { sounds } from "./fruits.js";

const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

const canvasRect = canvas.getBoundingClientRect();
let canvasOffsetX = canvasRect.left;

function handleResize() {
    const canvasRect = canvas.getBoundingClientRect();
    canvasOffsetX = canvasRect.left;
    canvasOffsetY = canvasRect.top;
}

const g = 400; // Set gravitational acceleration
const restitution = 0.2; // Set a restitution, a lower value will lose more energy when colliding

let isMouseDown = false;
let secondsPassed = 0;
let oldTimeStamp = 0;
let score = 0;

class GameObject
{
    constructor (context, x, y, vx, vy, mass){
        this.context = context;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.mass = mass;

        this.isActive = false;
        this.isDropped = false;
        this.isColliding = false;
    }
}

class Circle extends GameObject{
    constructor(context, x, y, r, vx, vy, mass, index){
        super(context, x, y, vx, vy, mass);
        this.index = index;
        this.radius = fruitsData[this.index].size;
    }

    draw(){
        let fruit = new Image();
        fruit.src = fruitsData[this.index].fruit;
        this.context.drawImage(fruit, (this.x - this.radius), (this.y - this.radius), this.radius * 2, this.radius * 2);
    }

    update(secondsPassed){
        // Apply acceleration
        if (this.isActive){
            this.vy += g * secondsPassed;
        }

        // Move with set velocity
        this.x += this.vx * secondsPassed;
        this.y += this.vy * secondsPassed;
    }
}

let gameObjects = [];
let spawnedObjects = [];

function createWorld(){
    let random = Math.floor(Math.random() * 4);
    gameObjects.push(new Circle(context, 200, 50, 0, 0, 0, 5, random));
}

window.addEventListener('resize', handleResize);

canvas.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    if(!gameObjects[0].isDropped){
        const mouseX = e.clientX - canvasOffsetX;
        gameObjects[0].x = mouseX;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if(isMouseDown && !gameObjects[0].isDropped){
        const mouseX = e.clientX - canvasOffsetX;
        gameObjects[0].x = mouseX;
    }
});

window.addEventListener('mouseup', (e) => {
    isMouseDown = false;
    gameObjects[0].isActive = true;
    gameObjects[0].isDropped = true;
    if(gameObjects[0].isDropped){
        let spawned = gameObjects.splice(0, 1);
        spawnedObjects.push(spawned[0]);
    }
    sounds['click'].play();
    setTimeout(() => {
        createWorld();
    }, 500);
})

function animate(timeStamp){
    secondsPassed = (timeStamp - oldTimeStamp) / 400;
    oldTimeStamp = timeStamp;

    // Loop over all game objects
    for (let i = 0; i < spawnedObjects.length; i++) {
        spawnedObjects[i].update(secondsPassed);
    }

    for (let i = 0; i < gameObjects.length; i++) {
        gameObjects[i].update(secondsPassed);
    }

    detectCollisions();
    detectEdgeCollisions();
    clearCanvas();
    displayScore();

    // Do the same to draw
    for (let i = 0; i < spawnedObjects.length; i++) {
        spawnedObjects[i].draw();
    } 

    for (let i = 0; i < gameObjects.length; i++) {
        gameObjects[i].draw();
    }

    window.requestAnimationFrame(animate);
}

function detectCollisions(){
    let obj1;
    let obj2;

    // Reset collision state of all objects
    for (let i = 0; i < spawnedObjects.length; i++) {
        spawnedObjects[i].isColliding = false;
    }

    // Start checking for collisions
    for (let i = 0; i < spawnedObjects.length; i++)
    {
        obj1 = spawnedObjects[i];
        for (let j = i + 1; j < spawnedObjects.length; j++)
        {
            obj2 = spawnedObjects[j];

            if (circleIntersect(obj1.x, obj1.y, obj1.radius, obj2.x, obj2.y, obj2.radius) && obj1.index === obj2.index) {
                // Combine circles
                let newIndex = obj1.index + 1;
                let newX = (obj1.x + obj2.x) / 2;
                let newY = (obj1.y + obj2.y) / 2;
                let newMass = obj1.mass + obj2.mass;
                let newRadius = fruitsData[newIndex].size;
        
                spawnedObjects.splice(j, 1);
                spawnedObjects.splice(i, 1);
        
                spawnedObjects.push(new Circle(context, newX, newY, newRadius, 0, 2 * Math.PI, newMass, newIndex));
                for(let i = 0; i < spawnedObjects.length; i++){
                    spawnedObjects[i].isActive = true;
                }
                sounds['pop0'].play();

                score += fruitsData[newIndex].score;
                console.log("Combined");
                console.log(score);
                console.log(spawnedObjects);

                return;

            } else if (circleIntersect(obj1.x, obj1.y, obj1.radius, obj2.x, obj2.y, obj2.radius)){
                obj1.isColliding = true;
                obj2.isColliding = true;

                // Change velocity and direction
                let vCollision = {x: obj2.x - obj1.x, y: obj2.y - obj1.y};
                let distance = Math.sqrt((obj2.x - obj1.x)*(obj2.x - obj1.x) + (obj2.y - obj1.y)*(obj2.y - obj1.y));
                let vCollisionNorm = {x: vCollision.x / distance, y: vCollision.y / distance};
                let vRelativeVelocity = {x: obj1.vx - obj2.vx, y: obj1.vy - obj2.vy};
                let speed = vRelativeVelocity.x * vCollisionNorm.x + vRelativeVelocity.y * vCollisionNorm.y;
                
                // Calculate mass
                let impulse = 2 * speed / (obj1.mass + obj2.mass);
                if(speed < 0){
                    break;
                } else {
                    // Lose energy after each collision
                    speed *= Math.min(obj1.restitution, obj2.restitution);
                    obj1.vx -= (impulse * obj2.mass * vCollisionNorm.x);
                    obj1.vy -= (impulse * obj2.mass * vCollisionNorm.y);
                    obj2.vx += (impulse * obj1.mass * vCollisionNorm.x);
                    obj2.vy += (impulse * obj1.mass * vCollisionNorm.y);
                }
            }
        }
    }
}

function detectEdgeCollisions(){
    let obj;
    for(let i = 0; i < spawnedObjects.length; i++){
        obj = spawnedObjects[i];

        // Check for left and right
        if(obj.x < obj.radius){
            obj.vx = Math.abs(obj.vx) * restitution;
            obj.x = obj.radius;
        } else if(obj.x > canvasWidth - obj.radius){
            obj.vx = -Math.abs(obj.vx) * restitution;
            obj.x = canvasWidth - obj.radius;
        }

        // Check for bottom and top
        if(obj.y < obj.radius){
            obj.vy = Math.abs(obj.vy) * restitution;
            obj.y = obj.radius;
        } else if(obj.y > canvasHeight - obj.radius){
            obj.vy = -Math.abs(obj.vy) * restitution;
            obj.y = canvasHeight - obj.radius;
        }
    }
}

function circleIntersect(x1, y1, r1, x2, y2, r2){
    let circleDistance = (x1 - x2)*(x1 - x2) + (y1 - y2)*(y1 - y2);
    return circleDistance <= ((r1 + r2) * (r1 + r2));
}

function clearCanvas(){
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function displayScore(){
    context.fillStyle = "black";
    context.font = "20px arial";
    context.textAlign = 'left';
    context.fillText('Score: ' + score, 10, 25); 
}

createWorld();
animate(0);
handleResize();
