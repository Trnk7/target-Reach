const cnv  = document.getElementById('cnv');
const ctx = cnv.getContext('2d');

cnv.width=750;
cnv.height=400;

let mouse = {x: cnv.width/2, y: cnv.height/2};
let target = {x: cnv.width/2, y: cnv.height/2};

cnv.onclick=(e)=>{
    mouse.x=e.offsetX;
    mouse.y=e.offsetY;
    evolve()
}

function seeded(s){
    let m =0x80000000, a=16042006, c=28122005;
    let state = s;
    return function(){
        state = (a * state + c) % m;
        return state / (m - 1);
    }
}
const seed = Math.floor(Math.random()*1000);
let random = seeded(seed);
let bestf=0;
let gw = cnv.width/70;
let gh = cnv.height/30

class NeuralNet{
    constructor(i,h,o){
        this.w1=new Array(h).fill().map(()=>new Array(i).fill().map(()=>random()*2-1));
        this.b1= new Array(h).fill().map(()=>random()*2-1);
        this.w2=new Array(o).fill().map(()=>new Array(h).fill().map(()=>random()*2-1));
        this.b2= new Array(o).fill().map(()=>random()*2-1);

    }
    activation(x){
        return 1/(1+Math.exp(-x));
    }
    think(input){
        let h = this.w1.map((weights, i) => {
            let sum = weights.reduce((acc, w, j) => acc + w * input[j], 0);
            sum += this.b1[i];
            return this.activation(sum);
        });
        let output = this.w2.map((weights, i) => {
            let sum = weights.reduce((acc, w, j) => acc + w * h[j], 0);
            sum += this.b2[i];
            return this.activation(sum);
        });
        return output;
    }
    mutate(rate){
        function mutateValue(val, rate){
            if(random() < rate){
                return val + (random()*2 -1)*0.5;
            }
            return val;
        }
        this.w1 = this.w1.map(row => row.map(val => mutateValue(val, rate)));
        this.b1 = this.b1.map(val => mutateValue(val, rate));
        this.w2 = this.w2.map(row => row.map(val => mutateValue(val, rate)));
        this.b2 = this.b2.map(val => mutateValue(val, rate));
    }
    clone(){
        let clone = new NeuralNet(0,0,0);
        clone.w1 = this.w1.map(row => [...row]);
        clone.b1 = [...this.b1];
        clone.w2 = this.w2.map(row => [...row]);
        clone.b2 = [...this.b2];
        return clone;
    }
    
}
class Rocket{
    constructor(brain){
        this.x =20
        this.y = cnv.height/2;
        this.bx = 20
        this.angle = 0;
        this.speed = 0;
        this.brain = brain || new NeuralNet(5,8,2);
        this.size = 5;
        this.fitness = 0;
        this.dead=false;
        this.age=0
        this.color = `hsl(${this.fitness*30}, 80%, 60%)`;
    }
    reset(){
        this.dead = false
        this.age -= 30
        this.x = this.bx;
        this.y = cnv.height / 2
        this.angle = 0
        this.speed = 0;
        this.age = 0;
    }
    update(){
        bestf = Math.max(this.fitness,bestf)
        this.age++;
        let dx = target.x - this.x;
        let dy = target.y - this.y;
        let distance = Math.hypot(dx, dy);
        let targetAngle = Math.atan2(dy,dx)
        if(distance>30&&this.dead){
           this.reset()
        }
        if(this.dead)return;
        let normDx = dx / (distance || 1);
        let normDy = dy / (distance || 1);
        let inputs = [
            normDx,
            normDy,
            Math.cos(this.angle-targetAngle),
            Math.sin(this.angle-targetAngle),
            this.speed / 5
        ];
        let output = this.brain.think(inputs);
        let turn = (output[0] - 0.5) * 0.4;
        let accel = (output[1]) * 0.2;
        this.angle += turn; 
        this.speed += accel;
        this.speed = Math.max(0, Math.min(this.speed, 5));
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        
        this.x = Math.max(0, Math.min(cnv.width, this.x));
        this.y = Math.max(0, Math.min(cnv.height, this.y));
        
        this.fitness = (Math.hypot(cnv.width,cnv.height)-distance)/Math.hypot(cnv.width,cnv.height)
        if(distance < 10){
            let t =1-(this.age/ maxAge)
            this.fitness = 25+t
            this.dead=true
        }
        //else if(distance < 50){
            
        //     this.fitness += 2*(1/(this.age+1));
        //     this.color = `hsl(${this.fitness*30}, 80%, 60%)`;
        // }else{
        this.fitness -= 0.0002*this.age
        //     if(this.fitness < 0) this.fitness = 0;
           
        // }
        
    }
    draw(){
         this.color = `hsl(${this.fitness*3}, 80%, 60%)`;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size, this.size);
        ctx.lineTo(-this.size, -this.size);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(target.x, target.y, 5, 0, Math.PI*2);
        ctx.fill();
    }
}
let populationSize = 100;
let maxAge=600
let creatures = [];
for(let i=0; i<populationSize; i++){
    creatures.push(new Rocket());
}
let gen =0;
let best=0;
function evolve(){
    gen++;
    creatures.sort((a,b) => b.fitness - a.fitness);
    let topCreatures = creatures.slice(0,creatures.length/3);
    best = topCreatures[0].fitness;
    let newCreatures = [];
    while(newCreatures.length < populationSize){
        let parent = topCreatures[Math.floor(random()*topCreatures.length)];
        let childBrain = parent.brain.clone();
        childBrain.mutate(0.1)
        let child = new Rocket(childBrain);
        newCreatures.push(child);
    }
    creatures = newCreatures;
}
let frameCount = 0;
let t=0;
function train(ep=5){
    for(let i=0;i<ep;i++){
        for(let f = 0;f<maxAge;f++){
            creatures.forEach(c=>c.update())
        }
        evolve()
    }
frameCount=0
}
// train(40)
function animate(){
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0,0,cnv.width, cnv.height);
    ctx.fillStyle='white';
    ctx.font='20px Arial';
    ctx.fillText(`gen: ${gen} best:${best.toFixed(2)} bestf: ${bestf.toFixed(3)}`,10,40);
    t+=0.05
    bestf=0;
    for(let creature of creatures){
        creature.update();
        creature.draw();
    }
    frameCount++;
    if(frameCount>=maxAge){
        frameCount=0
        evolve();
    }
    requestAnimationFrame(animate);
}
animate();

function rot(){
    t+=0.01;

    target.x = mouse.x + Math.sin(t)* 50
    target.y = mouse.y + Math.cos(t)* 50

}
setInterval(rot,1000/20)



