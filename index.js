const { rateLimiter, quickfunctions } = require('./src/middlewares/index.js');
const app = quickfunctions.createnewapp();
const port = 3000;
const axios = require("axios");
const { auth } = require('express-openid-connect');
const { requiresAuth } = require('express-openid-connect');

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let analyticsdata = {};
if (process.env["API"]) {

} else {
  require("dotenv").config({ path: ".env.development.local" });
}


const {kv} = require("@vercel/kv")

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env["AUTH_CLIENT_SECRET"],
  baseURL: process.env["URL"] || "http://localhost:3000",
  clientID: process.env["AUTH_CLIENT_ID"],
  issuerBaseURL: 'https://opensearch-mu.eu.auth0.com'
};

app.use(auth(config));

const apikey = process.env["API"]

app.use(require("cookie-parser")());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/html/homepage.html")
});

app.get("/betatest.pdf", (req, res) => {
  res.sendFile(__dirname + "/betatest.pdf");
});


app.get("/beta", (req, res) => {
  res.sendFile(__dirname + "/html/index.html");
});

app.get("/style.css", (req, res) => {
  res.sendFile(__dirname + "/html/style.css");
});

app.get("/script.js", (req, res) => {
  res.sendFile(__dirname + "/publicjs/script.js");
});

// Handle search requests
app.get("/imagesearch", async (req, res) => {
  const query = req.query["q"];

  // Handle empty or undefined search query
  if (!query) {
    res.send(
      `Search cannot be empty<br><br><button onclick='window.location.href="/"'>Back</button><link rel="stylesheet" href="style.css"><meta name="viewport" content="width=device-width, initial-scale=1.0">`
    );
    return;
  }

  try {
    // Make the search request using axios
    const response = await axios.get(
      `https://customsearch.googleapis.com/customsearch/v1?cx=16cbbe12944fc4eb4&gl=us&q=${query}&key=${apikey}`
    );

    // Generate the main HTML content
    let mainhtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="style.css">
    </head>
    <body>
    <div id="overlay">
      <div id="popup">
        <p>This site uses cookies! Also, you can help us make this site better by enabling analytics</p>
        <button onclick="consentdisable()">Accept and disable analytics</button>
        <button onclick="consentenable()">Accept and enable analytics</button>
      </div>
    </div> 
    <header>
      <h1><a href="/beta">OpenSearch</a></h1>
      <form action="/search" method="GET">
        <input type="text" name="q" placeholder="Search..." id="search-bar">
        <button type="submit">Search</button>
      </form>
    </header>
    <div id="warning">
      <p>This is a beta site, expect some bugs</p>
      <button onclick='window.location.href="/beta/feedback"'>Give Feedback</button>
    </div><br>
    `;

    // Process search results and generate HTML snippets
    for (const item of response.data.items) {
      const screenshot = await fetch("https://shot.screenshotapi.net/screenshot?token=" + process.env["SCREENSHOT_TOKEN"] + "&url=" + item.link + "&width=1000&height=1000&&output=json&file_type=png")
      const screenshotjson = await screenshot.json()
      console.log(item.link)
      mainhtml += `
      <div name="${item.cacheId}">
<h2\><a href\="</span>${item.formattedUrl}"><span class="math-inline">${item.htmlTitle}</a\></h2\>
<p\>Von <a href\="</span>${item.displayLink}"><span class="math-inline">${item.displayLink}</a\></p\>
<p\></span>${item.htmlSnippet}</p>
<p><a href="${item.formattedUrl}">${item.htmlFormattedUrl}</a></p>
<img src="${screenshotjson.screenshot}" width="500">
</div>
`;
}



// Finalize the HTML and send the response
mainhtml += `</body><script src='/analytics.js'></script><script src='/search.js'></script><script src='/search-cookies.js'></script></html>`;
res.send(mainhtml);
} catch (err) {
// Handle errors
if (err.includes("SyntaxError: Unexpected token < in JSON")) {
    res.send("API Timeout!<br><button onclick='window.reload()'>Retry</button>")
} else {
  console.error(err);
res.status(500).send(`
<error>
  <h1>Error: ${err.message}</h1>
</error>
Please open a bug issue at <a href="https://github.com/Our-Code-24/opensearch/issues">our github repo</a>
`);
}
}
});

app.get("/search", async (req, res) => {
  const query = req.query["q"];
  let mainhtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
  <div id="overlay">
    <div id="popup">
      <p>This site uses cookies! Also, you can help us make this site better by enabling analytics</p>
      <button onclick="consentdisable()">Accept and disable analytics</button>
      <button onclick="consentenable()">Accept and enable analytics</button>
    </div>
  </div> 
  <header>
    <h1><a href="/beta">OpenSearch</a></h1>
    <form action="/search" method="GET">
      <input type="text" name="q" placeholder="Search..." id="search-bar">
      <button type="submit">Search</button>
    </form>
  </header>
  <div id="warning">
      <p>This is a beta site, expect some bugs</p>
      <button onclick='window.location.href="/beta/feedback"'>Give Feedback</button>
    </div><br>
  `;

if (query == "" || query == undefined) {
  res.send(`Search cannot be empty<br><br><button onclick='window.location.href="/"'>Back</button><link rel="stylesheet" href="style.css"><meta name="viewport" content="width=device-width, initial-scale=1.0">`)
  return
}

  axios.get("https://customsearch.googleapis.com/customsearch/v1?cx=16cbbe12944fc4eb4&gl=de&q=" + query + "&key=" + apikey).then(async (value) => {
      value.data.items.forEach((item) => {
        mainhtml += `
          <div name="${item.cacheId}">
            <h2><a href="${item.link}">${item.htmlTitle}</a></h2>
            <p>Von <a href="${item.displayLink}">${item.displayLink}</a></p>
            <p>${item.htmlSnippet}</p>
            <p><a href="${item.formattedUrl}">${item.htmlFormattedUrl}</a></p>
          </div>
        `;
      })

      mainhtml += "</body><script src='/analytics.js'></script><script src='/search.js'></script><script src='/search-cookies.js'></script></html>";
      if (req.oidc.user) {
        const newval = Number(await kv.get(req.oidc.user.sub))
        await kv.set(req.oidc.user.sub, newval + 1)
      }
      res.send(mainhtml);
    }).catch((err) => {
      res.status(500).send(`
      <error>
      <h1>Error: ${err}</h1>
      </error>
      Please open a bug issue at <a href="https://github.com/Our-Code-24/opensearch/issues">our github repo</a>
      `)
      throw err
    })
})

// Get user's cookie preferences
app.get("/settings", (req, res) => {
const settings = {};

if (req.cookies["cookies-consent"]) {
settings["cookies-consent"] = req.cookies["cookies-consent"];
} else {
settings["cookies-consent"] = "undefined";
}

if (req.cookies["analytics"]) {
settings["analytics"] = req.cookies["analytics"];
} else {
settings["analytics"] = "undefined";
}

res.send(JSON.stringify(settings));
});

// Set user's cookie preferences
app.get("/set-settings", (req, res) => {
const cookiesConsent = req.query["cookiesconsent"];
const analytics = req.query["analytics"];

res.cookie("cookies-consent", cookiesConsent);
res.cookie("analytics", analytics);
res.sendStatus(200);
});

// Serve analytics.js
app.get("/analytics.js", (req, res) => {
res.sendFile(__dirname + "/publicjs/analytics.js");
});

// Report search query for analytics
app.get("/api/analytics/report", (req, res) => {
const searchQuery = req.query["q"];
quickfunctions.analyticstool(searchQuery).then(() => {
res.sendStatus(200);
});
});

// Get analytics data
app.get("/api/analytics", (req, res) => {
  kv.get("analytics_data").then((val) => {
    res.send(val)
  })
})
// req.oidc.isAuthenticated()
app.get("/search.js", (req, res) => {
res.sendFile(__dirname + "/publicjs/search.js");
});

// Serve search-cookies.js
app.get("/search-cookies.js", (req, res) => {
res.sendFile(__dirname + "/publicjs/searchcookies.js");
});

// Serve beta.html for feedback
app.get("/beta/feedback", (req, res) => {
res.sendFile(__dirname + "/html/beta.html");
});

// Report feedback
app.get("/api/beta/feedback/report", (req, res) => {
kv.get("betafeedback").then((val) => {
if (val === undefined) {
val = [];
}

val.push(req.query);
kv.set("betafeedback", val).then(() => {
res.redirect("/beta");
});
});
});

// Get feedback (requires authorization)
app.get("/api/beta/feedback", (req, res) => {
kv.get("betafeedback").then((val) => {
if (req.query["code"] === process.env["FEEDBACK"]) {
res.send(val);
} else {
res.sendStatus(403); // Unauthorized
}
});
});

app.get("/img-p", (req, res) => {
  res.sendFile(__dirname + "/html/img-p.html")
})

app.get("/favicon.ico", (req, res) => {
  res.sendFile(__dirname + "/favicon.ico")
})

app.get("/.well-known/discord", (req, res) => {
  res.send("dh=b469ec13cb6b78bd9e57feb0b5072d6721c063af")
})

app.get('/profile', (req, res) => {
  res.send(JSON.stringify(req.oidc.user))
});

app.get("/points", requiresAuth(), async (req, res) => {
  const points = await kv.get(req.oidc.user.sub)
  if (points == undefined) {
    kv.set(req.oidc.user.sub, 0)
    res.send("0")
  } else {
    res.send(String(points))
  }
})

app.listen(port, () => {
console.log("We are online on port", port);
});
