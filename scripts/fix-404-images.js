const fs = require('fs');
const https = require('https');
const path = require('path');

const detailsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-car-details.json');
const carsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-cars.json');
const details = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
const carsData = JSON.parse(fs.readFileSync(carsPath, 'utf8'));

function checkUrl(url) {
  return new Promise(resolve => {
    https.get(url, res => resolve(res.statusCode)).on('error', () => resolve(0));
  });
}

async function main() {
  const newIds = [
    '3668','3772','3775','3803','3825','3982','3992','4011','4043','4062','4072','4073',
    '4111','4119','4171','4363','4373','4379','4380','4395','4404','4421','4427','4431','4436',
    '4446','4461','4471','4472','4476','4479','4495','4496','4499',
    '4506','4507','4508','4511','4513','4516','4517','4548','4551','4555','4560','4565','4566','4568','4569',
    '4582','4613','4619','4626','4629','4632','4635','4638','4639','4646','4649','4650','4651','4652','4655','4656','4657',
    '4670','4674','4683','4700','4705','4737','4740','4741','4747','4750','4763','4777','4779',
  ];

  let fixed = 0;
  for (const id of newIds) {
    const d = details[id];
    if (d === undefined || d.colorImages === undefined || d.colorImages.length === 0) continue;

    const firstUrl = d.colorImages[0].imageUrl;
    if (firstUrl.indexOf('/color_') === -1) continue;

    const status = await checkUrl(firstUrl);
    if (status !== 200) {
      const match = firstUrl.match(/photo\/(\d+)\/(\d+)\/color_/);
      if (match) {
        const lineupUrl = 'https://autoimg.danawa.com/photo/' + match[1] + '/' + match[2] + '/lineup_360.png';
        d.colorImages.forEach(c => { c.imageUrl = lineupUrl; });
        d.imageUrl = lineupUrl;
        const carEntry = carsData.cars.find(c => c.id === id);
        if (carEntry) carEntry.imageUrl = lineupUrl;
        console.log('Fixed ' + d.brand + ' ' + d.name + ' (' + id + '): lineup');
        fixed++;
      }
    } else {
      process.stdout.write('.');
    }
  }

  fs.writeFileSync(detailsPath, JSON.stringify(details, null, 2), 'utf8');
  fs.writeFileSync(carsPath, JSON.stringify(carsData, null, 2), 'utf8');
  console.log('\nTotal fixed: ' + fixed);
}

main();
