from django.db import migrations, models


def delete_drawdown_rules(apps, schema_editor):
    AlertRule = apps.get_model("market", "AlertRule")
    AlertRule.objects.filter(rule_type="DRAWDOWN_PCT").delete()


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("market", "0011_alter_watchlistitem_unique_together_and_more"),
    ]

    operations = [
        migrations.RunPython(delete_drawdown_rules, noop_reverse),
        migrations.AlterField(
            model_name="alertrule",
            name="rule_type",
            field=models.CharField(
                choices=[
                    ("PRICE_ABOVE", "Price Above"),
                    ("PRICE_BELOW", "Price Below"),
                    ("MOVE_UP_PCT", "Move Up (%)"),
                    ("MOVE_DOWN_PCT", "Move Down (%)"),
                    ("EVENT_SOON_MINUTES", "Event Soon (minutes)"),
                ],
                max_length=32,
            ),
        ),
        migrations.DeleteModel(name="TradeReview"),
        migrations.DeleteModel(name="PortfolioSnapshot"),
        migrations.DeleteModel(name="PaperOrder"),
        migrations.DeleteModel(name="PaperTrade"),
        migrations.DeleteModel(name="PaperPosition"),
        migrations.DeleteModel(name="ScreenerPreset"),
        migrations.DeleteModel(name="PaperPortfolio"),
    ]
