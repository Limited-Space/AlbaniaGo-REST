const app = require('express')();
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const faunadb = require('faunadb');

const {
    Map,
    Lambda,
    Ref,
    Select,
    Paginate,
    Documents,
    Get,
    Match,
    Index,
    Create,
    Collection,
    Join,
    Call
} = faunadb.query;


const port = 3000 || process.env.PORT;
const client = new faunadb.Client({
    secret: 'fnAD9qheq3ACAQVN5xdNY6vbRRDWt8qh1gaXvPVT'
});

app.use(cors());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    if(req.method === "OPTIONS"){
        res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
        return res.status(200).json({}); 
    }
    next();
});

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json()); 


// Handles post and get requests for places

// Returns a specific place for a give ID
app.get('/places/:place', async (req, res) => {
    try {
        const doc = await client.query(
            Get(
                Ref(
                    Collection('places'),
                    req.params.place
                )
            )
        );

        res.send(doc);
    }
    catch(error) {
        res.status(400);
        res.send(error);
    }
});

app.get('/', (req, res) => {
    res.sendFile(`${path.dirname(__dirname)}/UI/index.html`);
});

// Returns all the places from the places collection
app.get('/places', async (req, res) => {
    try {
        // Extracts all the documents by mapping the IDs extracted to the respective documents from the places collection
        const docs = await client.query(
            Map(
                Paginate(
                    Documents(Collection('places'))
                ),
                Lambda(x => Get(x))
            )
        );
        res.send(docs);
    }
    catch(error){
        res.status(400);
        res.send(error);
    }
});

// Adds a place into the places collection
app.post('/places', async (req, res) => {
    try {
        const data = {
            name: req.body.name,
            description: req.body.description,
            season: req.body.season,
            imageURL: req.body.imageURL,
            isFavorite: req.body.isFavorite
        }

        const doc = await client.query(
            Create(
                Collection('places'),
                { data }
            )
        );
        res.status(200);
        res.send(doc);
    }

    catch(error) {
        res.status(400);
        res.send(error);
    }
});

// Handles post and get requests for sights

// Returns all the sights for a given place
app.get('/places/:place/sights', async (req, res) => {
    try {
        const docs = await client.query(
            Map(
                Paginate(
                    Match(  
                        Index('sights_by_place'),
                        Ref(Collection('places'), req.params.place)
                    )
                ),
                Lambda(x => Get(x))
            )
        );
        res.send(docs);
    }

    catch(error) {
        res.status(400);
        res.send(error);
    }
});

// Returns all the sights from the sights collection
app.get('/sights', async (req, res) => {
    try {
        const docs = await client.query(
            Map(
                Paginate(
                    Documents(Collection('sights'))
                ),
                Lambda(x => Get(x))
            )
        );
        res.send(docs);
    }   
    catch(error) {
        res.status(400);
        res.send(error);
    }
});

// Adds a sight into the sights collection
app.post('/sights', async (req, res) => {
    try{
        const placeREF = await client.query(
            Select(
                'ref', 
                Get(
                    Match(
                        Index('places_by_name'),
                        req.body.place
                    )
                )
            )
        );

        const data = {
            place: placeREF,
            sight: req.body.sight,
            description: req.body.description,
            info: req.body.info
        };

        const doc = await client.query(
            Create(
                Collection('sights'),
                { data }
            )
        );
        
        res.send(doc);
    }
    catch(error) {
        res.status(400);
        res.send(error);
    }
}); 

// Error handling 

app.use((req, res, next) => {
    const error = new Error('Not Found!');
    error.status(404);
    next(error);
});

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
});

app.listen(port, () => console.log(`API on http://localhost:${port}`));