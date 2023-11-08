const express=require('express');
const cors=require('cors');
const jwt=require('jsonwebtoken');
const cookieParser=require('cookie-parser')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app=express();
const port=process.env.PORT || 5000;
// ==========middleware==========
app.use(cors({
  origin:['https://jobdoc-de92b.web.app','https://jobdoc-de92b.firebaseapp.com'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
// ========== custom middleware ==========
const verifyToken=async(req,res,next)=>{
  const token=req.cookies?.token;
  if(!token){
    return res.status(401).send({message:'Not Authorized'})
  }
  jwt.verify(token,process.env.TOKEN,(err,decoded)=>{
      if(err)return res.status(401).send({message:'Not Authorized'})
      req.user=decoded
    console.log('success');
      next()
  })  
}
// =======================================================================================
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u9t7oll.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    const myDB=client.db('JobDoc').collection('Jobs')
    // ========================================= JWT secure api =============================================================
      app.post('/jwt',async(req,res)=>{
        const user=req.body;
        console.log(user);
        const token=jwt.sign(user,process.env.TOKEN,{expiresIn:'1h'})
        res.cookie('token',token,{
          httpOnly: true,
          secure: true,
          sameSite: 'none'
        })
        .send({success: true});
      })
      app.post('/logout',async(req,res)=>{
        const user=req.body;
        res.clearCookie('token',{maxAge:0})
        .send({success: true});
      })
    // ========================================= all jobs + update + my job api =============================================================
    app.get('/all-jobs', async(req,res)=>{
      console.log(req.cookies?.token);
        const cursor=myDB.find();
        const result=await cursor.toArray();
        res.send(result)
      })
    app.get(`/searched-jobs/:id`, async(req,res)=>{
      const id = req.params.id;
      console.log(id);
        const cursor = myDB.find({
          Job_Type: {
            // $regex : `(?i)${id}`
            // $regex : `/${id}/i`
            $regex: `${id}`,
            $options: 'i'
          }
        });
        const result = await cursor.toArray();
        res.send(result)
      })
    app.post('/all-jobs', async(req,res)=>{
        const job=req.body;
        const result=await myDB.insertOne(job);
        res.send(result);
    })
    app.get('/all-jobs/:id', async(req,res)=>{
        const id = req.params.id;
        console.log("id",id);
        const query = {_id: new ObjectId(id)};

        const result = await myDB.findOne(query);
        res.send(result)
      })
    app.get('/update/:id', async(req,res)=>{
        const id = req.params.id;
        console.log("id",id);
        const query = {_id: new ObjectId(id)};

        const result = await myDB.findOne(query);
        res.send(result)
      })
    app.get('/my-jobs/:id',verifyToken, async(req,res)=>{
        const id = req.params.id;
        // console.log(id,req.user.email);
        if(req.user.email!=id){
          return res.status(403).send({message:'Forbidden Access'})
        }
        const cursor = myDB.find({
          userEmail: id,
        });
        const result = await cursor.toArray();
        res.send(result)
      })
    app.get('/applied-jobs/:id',verifyToken, async(req,res)=>{
        const id = req.params.id;
        const cursor = myDB.find({
          Applied: true,
          userEmail: id
        });
        const result = await cursor.toArray();
        res.send(result)
      })
      app.put('/all-jobs/:id', async(req,res)=>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const options={upsert: true}
        const updatedJob=req.body;
        
        const Job={
          $set:{
            Job_Title: updatedJob.Job_Title,
            Name: updatedJob.Name,
            Company_Logo: updatedJob.Company_Logo,
            Job_Posting_Date: updatedJob.Job_Posting_Date,
            Salary_Range: updatedJob.Salary_Range,
            Job_Type: updatedJob.Job_Type,
            Job_Applicants_Number: updatedJob.Job_Applicants_Number,
            Application_Deadline: updatedJob.Application_Deadline,
            Job_Description: updatedJob.Job_Description,
            Posted: updatedJob.Posted,
            Applied: updatedJob.Applied
          }
          
        }
        const resust = await myDB.updateOne(filter,Job,options);
        res.send(resust)
      })
      app.put('/applied-jobs/:id', async(req,res)=>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const options={upsert: true}
        const AppliedJob=req.body;
        //console.log(updatedJob.userEmail,updatedJob.name,updatedJob.photo,updatedJob.brand,updatedJob.price,updatedJob.type,updatedJob.rating,updatedJob.description);
        const Job={
          // name,photo,brand,price,type,rating,description
          $set:{
            Applied: AppliedJob.Applied,
            Job_Applicants_Number: AppliedJob.Job_Applicants_Number,
            userEmail: AppliedJob.userEmail
          }
          
        }
        const resust = await myDB.updateOne(filter,Job,options);
        res.send(resust)
      })
  
    app.delete('/all-jobs/:id', async (req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await myDB.deleteOne(query);
        res.send(result);
      });
    // ==================================================================================
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// ======================================================================================================
app.get('/',(req,res)=>{
    res.send('Backend is running')
})
app.listen(port,()=>{
    console.log(`backend is running on port ${port}`);
})