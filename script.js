const fs = require('fs');
const file = 'c:/Users/KillianLQ/IBEE/apps/platform/src/components/profile/home-widgets/WidgetBodyDisplay.tsx';
let code = fs.readFileSync(file, 'utf8');

// remove badgeLabel from type
code = code.replace(/badgeLabel:\s*string\n/, '');
// remove badgeLabel from props
code = code.replace(/badgeLabel,\n/, '');
// remove badgeLabel passing
code = code.replace(/[ \t]*badgeLabel=".*?"\n/g, '');

const badgeOld = '<span className="wfeat__badge">{badgeLabel}</span>';
const badgeNew = 
            {!hidePrice && priceLabel ? (
              <span className="wfeat__badge">
                {promo && oldPriceLabel ? (
                  <>
                    <span className="wfeat__price-now">{priceLabel}</span>
                    <s className="ml-1.5 text-neutral-500 font-medium" style={{ fontSize: '11px', textDecorationColor: 'currentColor' }}>{oldPriceLabel}</s>
                  </>
                ) : (
                  <span className="wfeat__price-now">{priceLabel}</span>
                )}
              </span>
            ) : null};

code = code.replace(badgeOld, badgeNew);

const footerOldRegex = /<div className="wfeat__footer">[\s\S]*?<span className="wfeat__cta">\{ctaLabel\}<\/span>\s*<\/div>/;
const footerNew = <div className="wfeat__footer">
                <span className="wfeat__cta">{ctaLabel}</span>
              </div>;

code = code.replace(footerOldRegex, footerNew);

fs.writeFileSync(file, code);
console.log("Done");
