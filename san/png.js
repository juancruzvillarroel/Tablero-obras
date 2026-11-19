require('../node_modules/sharp')(process.argv[2]).png().toFile(process.argv[3]).then(i=>console.log(i.width,i.height));
